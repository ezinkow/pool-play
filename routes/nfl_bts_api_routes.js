const { NflBtsTeamAssignments, NflRegularSeasonGames, NflBtsPicks, NflBtsEntries, NflTeams, Users, Settings } = require("../models");
const db = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const assignTeamsToRoom = require("../client/src/services/nfl_bts_team_assigner");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Profile Statuses across rooms
    // ------------------------------------------------------------------
    app.get("/api/nfl_bts/entries/me", requireAuth, async (req, res) => {
        try {
            const entries = await NflBtsEntries.findAll({
                where: { user_id: req.user.id },
                raw: true
            });

            const enrichedEntries = await Promise.all(entries.map(async (entry) => {
                const assignment = await NflBtsTeamAssignments.findOne({
                    where: { user_id: req.user.id, room_id: entry.room_id }
                });
                return {
                    ...entry,
                    has_teams: !!(assignment && (assignment.team_name_1 || assignment.team_name_2))
                };
            }));

            res.json({ entries: enrichedEntries || [] });
        } catch (err) {
            console.error("❌ Error fetching entry status:", err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // ------------------------------------------------------------------
    // 2. POST Create/Initialize Profile Entry for a specific Room
    // ------------------------------------------------------------------
    app.post("/api/nfl_bts/entries/create", requireAuth, async (req, res) => {
        try {
            const room_id = parseInt(req.body.room_id || req.body.room_number) || 1;
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (![1, 2].includes(room_id)) {
                return res.status(400).json({ error: "Invalid room selection" });
            }

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_bts" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. Cannot join." });
                }
            }

            const currentRoomCount = await NflBtsEntries.count({ where: { room_id } });
            if (currentRoomCount >= 16) {
                return res.status(400).json({ error: "This room is full (max 16 players)." });
            }

            const nameTaken = await NflBtsEntries.findOne({ where: { entry_name, room_id } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken in this room" });
            }

            const existingInRoom = await NflBtsEntries.findOne({
                where: { user_id: req.user.id, room_id }
            });

            if (existingInRoom) {
                return res.status(400).json({ error: `You are already entered in Room ${room_id}` });
            }

            const entry = await NflBtsEntries.create({
                user_id: req.user.id,
                room_id,
                entry_name
            });

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 3. POST Leave Pool Entry for a specific Room
    // ------------------------------------------------------------------
    app.post("/api/nfl_bts/entries/leave", requireAuth, async (req, res) => {
        try {
            const room_id = parseInt(req.body.room_id || req.body.room_number);

            if (![1, 2].includes(room_id)) {
                return res.status(400).json({ error: "Invalid room selection" });
            }

            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_bts" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. You cannot leave." });
                }
            }

            // Check if teams have already been assigned for this user in this room
            const existingAssignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id, room_id }
            });

            if (existingAssignment && (existingAssignment.team_name_1 || existingAssignment.team_name_2)) {
                return res.status(403).json({ error: "You cannot leave this room anymore because teams have already been assigned!" });
            }

            const deletedCount = await NflBtsEntries.destroy({
                where: { user_id: req.user.id, room_id }
            });

            if (deletedCount === 0) {
                return res.status(404).json({ error: "Entry not found in this room" });
            }

            await NflBtsTeamAssignments.destroy({
                where: { user_id: req.user.id, room_id }
            });

            res.json({ success: true });
        } catch (err) {
            console.error("Leave pool error:", err);
            res.status(500).json({ error: "Failed to leave the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 4. GET All Entries
    // ------------------------------------------------------------------
    app.get("/api/nfl_bts/entries", async (req, res) => {
        try {
            const entries = await NflBtsEntries.findAll({
                attributes: ["id", "user_id", "room_id", "entry_name", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/games
    // --------------------------------------------------------
    app.get("/api/nfl_bts/games", requireAuth, async (req, res) => {
        try {
            const { week } = req.query;
            const whereClause = week ? { week: parseInt(week) } : {};
            const games = await NflRegularSeasonGames.findAll({
                where: whereClause,
                order: [['game_date', 'ASC']]
            });
            res.json(games || []);
        } catch (err) {
            console.error("Failed to fetch regular season games:", err);
            res.status(500).json({ error: "Failed to fetch games" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/assignment (Returns both assigned teams for the user)
    // --------------------------------------------------------
    app.get("/api/nfl_bts/assignment", requireAuth, async (req, res) => {
        try {
            const room_id = parseInt(req.query.room_id || req.query.room_number) || 1;
            const assignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id, room_id }
            });

            if (!assignment || !assignment.team_name_1) {
                return res.json({
                    team_name_1: null, logo_1: null, primary_color_1: null, secondary_color_1: null,
                    team_name_2: null, logo_2: null, primary_color_2: null, secondary_color_2: null
                });
            }

            const teamMeta1 = await db.NflTeams.findOne({ where: { name: assignment.team_name_1 } });
            const teamMeta2 = await db.NflTeams.findOne({ where: { name: assignment.team_name_2 } });

            res.json({
                team_name_1: assignment.team_name_1,
                division_1: assignment.division_1,
                logo_1: teamMeta1 ? teamMeta1.logo : null,
                primary_color_1: teamMeta1 ? teamMeta1.primary_color : null,
                secondary_color_1: teamMeta1 ? teamMeta1.secondary_color : null,
                team_name_2: assignment.team_name_2,
                division_2: assignment.division_2,
                logo_2: teamMeta2 ? teamMeta2.logo : null,
                primary_color_2: teamMeta2 ? teamMeta2.primary_color : null,
                secondary_color_2: teamMeta2 ? teamMeta2.secondary_color : null
            });
        } catch (err) {
            console.error("Error fetching assignment branding:", err);
            res.status(500).json({ error: "Failed to fetch assignment" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/picks
    // --------------------------------------------------------
    app.get("/api/nfl_bts/picks", requireAuth, async (req, res) => {
        try {
            const { week, room_id, room_number } = req.query;
            const targetRoom = parseInt(room_id || room_number) || 1;
            const targetWeek = parseInt(week) || 1;

            // Ensure user has an active assignment or entry in this room before querying picks
            const assignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id, room_id: targetRoom }
            });

            if (!assignment) {
                return res.json([]);
            }

            const picks = await NflBtsPicks.findAll({
                where: { user_id: req.user.id, week: targetWeek, room_id: targetRoom }
            });
            res.json(picks || []);
        } catch (err) {
            console.error("Error loading nflbts pick data:", err);
            res.status(500).json({ error: "Failed to fetch picks" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_bts/picks (Supports batch array or single pick payload)
    // --------------------------------------------------------
    app.post("/api/nfl_bts/picks", requireAuth, async (req, res) => {
        try {
            const { week, room_id, room_number, picks } = req.body;
            const targetRoom = parseInt(room_id || room_number) || 1;
            const targetWeek = parseInt(week) || 1;

            const picksArray = Array.isArray(picks) ? picks : [req.body];

            if (picksArray.length === 0) {
                return res.status(400).json({ error: "No picks provided." });
            }

            const assignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id, room_id: targetRoom }
            });

            if (!assignment) {
                return res.status(400).json({ error: "No teams assigned for this room." });
            }

            const allowedTeams = [assignment.team_name_1, assignment.team_name_2];

            for (const p of picksArray) {
                const { team_name, ats_pick, ou_pick } = p;

                if (!team_name || !allowedTeams.includes(team_name)) {
                    return res.status(400).json({ error: `Invalid team selection: ${team_name}` });
                }

                const matchup = await NflRegularSeasonGames.findOne({
                    where: {
                        week: targetWeek,
                        [Op.or]: [{ home_team: team_name }, { away_team: team_name }]
                    }
                });

                if (!matchup) return res.status(404).json({ error: `Matchup not found for ${team_name}.` });

                if (new Date() >= new Date(matchup.game_date)) {
                    return res.status(403).json({ error: `Game for ${team_name} has already kicked off. Picks are locked.` });
                }

                let existingPick = await NflBtsPicks.findOne({
                    where: { user_id: req.user.id, week: targetWeek, room_id: targetRoom, team_name }
                });

                if (existingPick) {
                    await existingPick.update({
                        game_id: matchup.id || matchup.game_id,
                        ats_pick,
                        ou_pick
                    });
                } else {
                    await NflBtsPicks.create({
                        user_id: req.user.id,
                        week: targetWeek,
                        room_id: targetRoom,
                        team_name,
                        game_id: matchup.id || matchup.game_id,
                        ats_pick,
                        ou_pick
                    });
                }
            }

            res.json({ success: true, message: "Picks saved successfully!" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to save picks" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/matrix
    // --------------------------------------------------------
    app.get("/api/nfl_bts/matrix", requireAuth, async (req, res) => {
        try {
            const { week, room_id, room_number } = req.query;
            const targetRoom = parseInt(room_id || room_number) || 1;
            const targetWeek = parseInt(week) || 1;

            const entries = await NflBtsEntries.findAll({
                where: { room_id: targetRoom },
                include: [{ model: Users, attributes: ["id", "name"] }],
                raw: true,
                nest: true
            });

            const matrix = [];

            for (const entry of entries) {
                const userId = entry.user_id;
                const userName = entry.entry_name || (entry.User ? entry.User.name : "Unknown");

                const assignment = await NflBtsTeamAssignments.findOne({
                    where: { user_id: userId, room_id: targetRoom }
                });

                const team1 = assignment ? assignment.team_name_1 : null;
                const team2 = assignment ? assignment.team_name_2 : null;

                let logo1 = null, logo2 = null;
                if (team1) {
                    const m1 = await NflTeams.findOne({ where: { name: team1 } });
                    if (m1) logo1 = m1.logo;
                }
                if (team2) {
                    const m2 = await NflTeams.findOne({ where: { name: team2 } });
                    if (m2) logo2 = m2.logo;
                }

                const getTeamGameData = async (teamName) => {
                    if (!teamName) return null;
                    const game = await NflRegularSeasonGames.findOne({
                        where: {
                            week: targetWeek,
                            [Op.or]: [{ home_team: teamName }, { away_team: teamName }]
                        }
                    });
                    const pick = await NflBtsPicks.findOne({
                        where: { user_id: userId, week: targetWeek, room_id: targetRoom, team_name: teamName }
                    });

                    let awayLogo = null, homeLogo = null, favoriteLogo = null, favoriteTeam = null;
                    if (game) {
                        favoriteTeam = game.favorite || null;
                        const awayMeta = await NflTeams.findOne({ where: { name: game.away_team } });
                        const homeMeta = await NflTeams.findOne({ where: { name: game.home_team } });
                        if (awayMeta) awayLogo = awayMeta.logo;
                        if (homeMeta) homeLogo = homeMeta.logo;
                        if (favoriteTeam) {
                            const favMeta = await NflTeams.findOne({ where: { name: favoriteTeam } });
                            if (favMeta) favoriteLogo = favMeta.logo;
                        }
                    }

                    // Calculate individual pick statuses if game is final
                    let calculatedStatus = pick ? pick.status : null;
                    let atsStatus = null;
                    let ouStatus = null;

                    if (game && pick) {
                        const isFinal = game.status === 'STATUS_FINAL' || game.game_status === 'STATUS_FINAL';

                        if (pick.ats_pick && game.ats_winner) {
                            const wonAts = pick.ats_pick.trim().toLowerCase() === game.ats_winner.trim().toLowerCase();
                            atsStatus = wonAts ? 'win' : (game.ats_winner.trim().toLowerCase() === 'push' ? 'push' : 'loss');
                        }

                        if (pick.ou_pick && game.ou_result) {
                            const pickClean = pick.ou_pick.replace(/^[⬆️⬇️\s]+/g, '').trim().toLowerCase();
                            const resultClean = game.ou_result.trim().toLowerCase();
                            const wonOu = pickClean === resultClean;
                            ouStatus = wonOu ? 'win' : (resultClean === 'push' ? 'push' : 'loss');
                        }

                        if (isFinal) {
                            // Aggregate win/loss default for row display
                            let wCount = 0;
                            let lCount = 0;
                            if (atsStatus === 'win') wCount++;
                            if (atsStatus === 'loss') lCount++;
                            if (ouStatus === 'win') wCount++;
                            if (ouStatus === 'loss') lCount++;

                            calculatedStatus = wCount > lCount ? 'win' : (lCount > wCount ? 'loss' : (wCount > 0 ? 'push' : null));
                        }
                    }

                    return {
                        team_name: teamName,
                        game_date: game ? game.game_date : null,
                        away_team: game ? game.away_team : null,
                        home_team: game ? game.home_team : null,
                        away_score: game ? (game.away_score ?? game.awayTeamScore) : null,
                        home_score: game ? (game.home_score ?? game.homeTeamScore) : null,
                        away_logo: awayLogo,
                        home_logo: homeLogo,
                        favorite: favoriteTeam,
                        favorite_logo: favoriteLogo,
                        spread: game ? game.spread : null,
                        adjusted_spread: game ? game.adjusted_spread : null,
                        over_under: game ? game.over_under : null,
                        ats_winner: game ? game.ats_winner : null,
                        ou_result: game ? game.ou_result : null,
                        game_status: game ? (game.status || game.game_status) : null,
                        ats_pick: pick ? pick.ats_pick : null,
                        ou_pick: pick ? pick.ou_pick : null,
                        ats_status: atsStatus,
                        ou_status: ouStatus,
                        status: calculatedStatus
                    };
                };

                const team1Data = await getTeamGameData(team1);
                const team2Data = await getTeamGameData(team2);

                matrix.push({
                    user_id: userId,
                    user_name: userName,
                    team_name_1: team1,
                    logo_1: logo1,
                    team_name_2: team2,
                    logo_2: logo2,
                    team1_game: team1Data,
                    team2_game: team2Data
                });
            }

            res.json(matrix);
        } catch (err) {
            console.error("Error fetching matrix data:", err);
            res.status(500).json({ error: "Failed to load group matrix" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/standings
    // --------------------------------------------------------
    app.get("/api/nfl_bts/standings", requireAuth, async (req, res) => {
        try {
            const room_id = parseInt(req.query.room_id) || 1;

            const query = `
                SELECT 
                    fa.user_id,
                    u.entry_name as user_name,
                    fa.team_name_1,
                    fa.division_1,
                    t1.logo as logo_1,
                    fa.team_name_2,
                    fa.division_2,
                    t2.logo as logo_2
                FROM nfl_bts_team_assignments fa
                JOIN nfl_bts_entries u ON fa.user_id = u.user_id AND fa.room_id = u.room_id
                LEFT JOIN nfl_teams t1 ON fa.team_name_1 = t1.name
                LEFT JOIN nfl_teams t2 ON fa.team_name_2 = t2.name
                WHERE fa.room_id = :room_id
            `;

            const [assignments] = await db.sequelize.query(query, {
                replacements: { room_id }
            });

            const picks = await NflBtsPicks.findAll({
                where: { room_id },
                raw: true
            });

            const games = await NflRegularSeasonGames.findAll({ raw: true });

            // Helper function to calculate record for a specific team name
            const getTeamRecord = (userId, teamName) => {
                const userTeamPicks = picks.filter(p => Number(p.user_id) === Number(userId) && p.team_name === teamName);

                let ats_wins = 0, ats_losses = 0, ou_wins = 0, ou_losses = 0, ou_pushes = 0;

                userTeamPicks.forEach(p => {
                    const game = games.find(g => String(g.id) === String(p.game_id) || String(g.game_id) === String(p.game_id));

                    if (game && game.status === 'STATUS_FINAL') {
                        if (p.ats_pick && game.ats_winner) {
                            if (p.ats_pick.trim().toLowerCase() === game.ats_winner.trim().toLowerCase()) {
                                ats_wins++;
                            } else {
                                ats_losses++;
                            }
                        }

                        if (p.ou_pick && game.ou_result) {
                            const pickedOu = p.ou_pick.trim().toLowerCase();
                            const gameOu = game.ou_result.trim().toLowerCase();
                            if (gameOu === 'push') {
                                ou_pushes++;
                            } else if (pickedOu === gameOu) {
                                ou_wins++;
                            } else {
                                ou_losses++;
                            }
                        }
                    }
                });

                return { ats_wins, ats_losses, ou_wins, ou_losses, ou_pushes };
            };

            const results = assignments.map(row => {
                const team1Stats = getTeamRecord(row.user_id, row.team_name_1);
                const team2Stats = getTeamRecord(row.user_id, row.team_name_2);

                return {
                    ...row,
                    // Pass individual records per team slot so the frontend maps them accurately
                    ats_wins_1: team1Stats.ats_wins,
                    ats_losses_1: team1Stats.ats_losses,
                    ou_wins_1: team1Stats.ou_wins,
                    ou_losses_1: team1Stats.ou_losses,

                    ats_wins_2: team2Stats.ats_wins,
                    ats_losses_2: team2Stats.ats_losses,
                    ou_wins_2: team2Stats.ou_wins,
                    ou_losses_2: team2Stats.ou_losses,

                    // Combined total fallback for sorting rows
                    ats_wins: team1Stats.ats_wins + team2Stats.ats_wins,
                    ats_losses: team1Stats.ats_losses + team2Stats.ats_losses,
                    ou_wins: team1Stats.ou_wins + team2Stats.ou_wins,
                    ou_losses: team1Stats.ou_losses + team2Stats.ou_losses
                };
            });

            res.json(results);
        } catch (err) {
            console.error("Error fetching standings:", err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_bts/admin/randomize-room-teams (Assigns 1 NFC and 1 AFC team to each user)
    // --------------------------------------------------------
    app.post("/api/nfl_bts/admin/randomize-room-teams", requireAuth, async (req, res) => {
        try {
            const dbUser = await Users.findByPk(req.user.id);
            const isAdmin = dbUser && (dbUser.is_admin === true || dbUser.is_admin === 1 || dbUser.isAdmin === true || dbUser.role === 'admin');

            if (!isAdmin) {
                return res.status(403).json({ error: "Unauthorized. Admin access required." });
            }

            const { room_id } = req.body;
            const roomId = parseInt(room_id) || 1;

            const entries = await NflBtsEntries.findAll({
                where: { room_id: roomId }
            });

            if (entries.length === 0) {
                return res.status(400).json({ error: `Room ${roomId} has no entries yet.` });
            }

            const usersList = entries.map(e => ({
                id: e.user_id
            }));

            // Clear existing team assignments for this room before re-assigning
            await NflBtsTeamAssignments.destroy({ where: { room_id: roomId } });

            const success = await assignTeamsToRoom(usersList, roomId);

            if (success) {
                return res.json({ success: true, message: `Room ${roomId} successfully randomized with 1 NFC and 1 AFC team per user ID!` });
            } else {
                return res.status(500).json({ error: "Team assignment execution failed." });
            }
        } catch (err) {
            console.error("Error randomizing room teams:", err);
            res.status(500).json({ error: "Failed to randomize room teams" });
        }
    });
};