const { NflBtsTeamAssignments, NflRegularSeasonGames, NflBtsPicks, NflBtsEntries, NflTeams, Users, Settings } = require("../models");
const db = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Profile Statuses across rooms
    // ------------------------------------------------------------------
    app.get("/api/nfl_bts/entries/me", requireAuth, async (req, res) => {
        try {
            const entries = await NflBtsEntries.findAll({
                where: { user_id: req.user.id }
            });
            res.json({ entries: entries || [] });
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

            if (![1, 2, 3].includes(room_id)) {
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

            if (![1, 2, 3].includes(room_id)) {
                return res.status(400).json({ error: "Invalid room selection" });
            }

            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_bts" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. You cannot leave." });
                }
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
    // GET /api/nfl_bts/assignment
    // --------------------------------------------------------
    app.get("/api/nfl_bts/assignment", requireAuth, async (req, res) => {
        try {
            const room_id = parseInt(req.query.room_id || req.query.room_number) || 1;
            const assignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id, room_id }
            });

            if (!assignment || !assignment.team_name) {
                return res.json({ team_name: null, logo: null, primary_color: null, secondary_color: null });
            }

            const teamMeta = await db.NflTeams.findOne({
                where: { name: assignment.team_name }
            });

            res.json({
                team_name: assignment.team_name,
                logo: teamMeta ? teamMeta.logo : null,
                primary_color: teamMeta ? teamMeta.primary_color : null,
                secondary_color: teamMeta ? teamMeta.secondary_color : null
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
            const pick = await NflBtsPicks.findOne({
                where: { user_id: req.user.id, week: parseInt(week), room_id: targetRoom }
            });
            res.json(pick || null);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch pick" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_bts/picks
    // --------------------------------------------------------
    app.post("/api/nfl_bts/picks", requireAuth, async (req, res) => {
        try {
            const { week, team_name, ats_pick, ou_pick, room_id, room_number } = req.body;
            const targetRoom = parseInt(room_id || room_number) || 1;

            if (!team_name) {
                return res.status(400).json({ error: "No team assigned for this room." });
            }

            const matchup = await NflRegularSeasonGames.findOne({
                where: {
                    week: parseInt(week),
                    [Op.or]: [{ home_team: team_name }, { away_team: team_name }]
                }
            });

            if (!matchup) return res.status(404).json({ error: "Matchup not found." });

            if (new Date() >= new Date(matchup.game_date)) {
                return res.status(403).json({ error: "This game has already kicked off. Picks are locked." });
            }

            let pick = await NflBtsPicks.findOne({
                where: { user_id: req.user.id, week: parseInt(week), room_id: targetRoom }
            });

            if (pick) {
                await pick.update({ ats_pick, ou_pick });
            } else {
                await NflBtsPicks.create({
                    user_id: req.user.id,
                    week: parseInt(week),
                    room_id: targetRoom,
                    team_name,
                    ats_pick,
                    ou_pick
                });
            }

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to save pick" });
        }
    });


    //  --------------------------------------------------------
    // GET /api/nfl_bts/matrix
    // --------------------------------------------------------
    app.get("/api/nfl_bts/matrix", requireAuth, async (req, res) => {
        try {
            const { week, room_id, room_number } = req.query;
            const targetRoom = parseInt(room_id || room_number) || 1;
            const targetWeek = parseInt(week) || 1;

            // Fetch all entries for this room
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

                // Get user's assigned team for this room
                const assignment = await NflBtsTeamAssignments.findOne({
                    where: { user_id: userId, room_id: targetRoom }
                });

                const teamName = assignment ? assignment.team_name : null;

                // Get team logo metadata
                let teamLogo = null;
                if (teamName) {
                    const teamMeta = await NflTeams.findOne({ where: { name: teamName } });
                    if (teamMeta) teamLogo = teamMeta.logo;
                }

                // Get game details for their assigned team this week
                let game = null;
                if (teamName) {
                    game = await NflRegularSeasonGames.findOne({
                        where: {
                            week: targetWeek,
                            [Op.or]: [{ home_team: teamName }, { away_team: teamName }]
                        }
                    });
                }

                // Get user's pick for this week
                const pick = await NflBtsPicks.findOne({
                    where: { user_id: userId, week: targetWeek, room_id: targetRoom }
                });

                // Get logos for teams in the matchup
                let awayLogo = null;
                let homeLogo = null;
                let favoriteLogo = null;
                let favoriteTeam = null;

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


                matrix.push({
                    user_id: userId,
                    user_name: userName,
                    team_name: teamName,
                    logo: teamLogo,
                    game_date: game ? game.game_date : null,
                    away_team: game ? game.away_team : null,
                    home_team: game ? game.home_team : null,
                    away_logo: awayLogo,
                    home_logo: homeLogo,
                    favorite_team: favoriteTeam,
                    favorite_logo: favoriteLogo,
                    adjusted_spread: game ? game.adjusted_spread : null,
                    over_under: game ? game.over_under : null,
                    ats_pick: pick ? pick.ats_pick : null,
                    ou_pick: pick ? pick.ou_pick : null,
                    status: pick ? pick.status : null
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
                fa.team_name,
                fa.division,
                t.logo,
                SUM(CASE WHEN fp.ats_status = 'win' THEN 1 ELSE 0 END) as ats_wins,
                SUM(CASE WHEN fp.ats_status = 'loss' THEN 1 ELSE 0 END) as ats_losses,
                SUM(CASE WHEN fp.ou_status = 'win' THEN 1 ELSE 0 END) as ou_wins,
                SUM(CASE WHEN fp.ou_status = 'loss' THEN 1 ELSE 0 END) as ou_losses,
                SUM(CASE WHEN fp.ou_status = 'push' THEN 1 ELSE 0 END) as ou_pushes
            FROM nfl_bts_team_assignments fa
            JOIN nfl_bts_entries u ON fa.user_id = u.user_id AND fa.room_id = u.room_id
            LEFT JOIN nfl_teams t ON fa.team_name = t.name
            LEFT JOIN nfl_bts_picks fp ON fa.user_id = fp.user_id AND fa.room_id = fp.room_id
            WHERE fa.room_id = :room_id
            GROUP BY fa.user_id, u.entry_name, fa.team_name, fa.division, t.logo
            ORDER BY fa.division ASC, ats_wins DESC, ou_wins DESC;
        `;

            const [results] = await db.sequelize.query(query, {
                replacements: { room_id }
            });
            res.json(results);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_bts/admin/randomize-room-teams
    // --------------------------------------------------------
    app.post("/api/nfl_bts/admin/randomize-room-teams", requireAuth, async (req, res) => {
        try {
            const dbUser = await Users.findByPk(req.user.id);
            const isAdmin = dbUser && (dbUser.is_admin === true || dbUser.is_admin === 1 || dbUser.isAdmin === true || dbUser.role === 'admin');

            if (!isAdmin) {
                return res.status(403).json({ error: "Unauthorized. Admin access required." });
            }

            const { room_id } = req.body;
            if (!room_id) {
                return res.status(400).json({ error: "Room ID is required." });
            }

            const allTeams = await NflTeams.findAll();
            if (!allTeams || allTeams.length === 0) {
                return res.status(400).json({ error: "No teams found in the database." });
            }

            // Fetch entries for this specific room
            const entries = await NflBtsEntries.findAll({ where: { room_id } });

            if (entries.length === 0) {
                return res.status(400).json({ error: `Room ${room_id} has no entries yet. At least one player must join before randomizing.` });
            }

            if (allTeams.length < entries.length) {
                return res.status(400).json({ error: `Not enough teams in the database (${allTeams.length}) to cover all entries (${entries.length}).` });
            }

            // Fetch existing assignments in OTHER rooms to prevent duplicate team assignments for multi-room users
            const otherAssignments = await NflBtsTeamAssignments.findAll({
                where: {
                    room_id: { [db.Sequelize.Op.ne]: room_id }
                }
            });

            const userBlockedTeams = {};
            otherAssignments.forEach(a => {
                if (!userBlockedTeams[a.user_id]) {
                    userBlockedTeams[a.user_id] = new Set();
                }
                userBlockedTeams[a.user_id].add(a.team_name);
            });

            const teamNames = allTeams.map(t => t.name);
            let shuffledTeams = [...teamNames].sort(() => Math.random() - 0.5);

            // Clear existing team assignments for this room before re-assigning
            await NflBtsTeamAssignments.destroy({ where: { room_id } });

            for (const entry of entries) {
                const userId = entry.user_id;
                if (!userBlockedTeams[userId]) {
                    userBlockedTeams[userId] = new Set();
                }

                let assignedTeam = null;
                let teamIndex = -1;

                for (let i = 0; i < shuffledTeams.length; i++) {
                    if (!userBlockedTeams[userId].has(shuffledTeams[i])) {
                        assignedTeam = shuffledTeams[i];
                        teamIndex = i;
                        break;
                    }
                }

                if (!assignedTeam) {
                    assignedTeam = shuffledTeams[0];
                    teamIndex = 0;
                }

                shuffledTeams.splice(teamIndex, 1);
                userBlockedTeams[userId].add(assignedTeam);

                const teamMeta = allTeams.find(t => t.name === assignedTeam);

                await NflBtsTeamAssignments.create({
                    user_id: userId,
                    room_id: room_id,
                    team_name: assignedTeam,
                    division: teamMeta ? teamMeta.division : "NFC North"
                });
            }

            res.json({ success: true, message: `Teams successfully randomized for Room ${room_id} (${entries.length} users assigned)!` });
        } catch (err) {
            console.error("Error randomizing room teams:", err);
            res.status(500).json({ error: "Failed to randomize room teams" });
        }
    });
};