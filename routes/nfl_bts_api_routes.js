const { NflBtsTeamAssignments, NflBtsGames, NflBtsPicks, NflBtsEntries, NflBtsTeams, Users, Settings } = require("../models");
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

            const teamMeta = await db.NflBtsTeams.findOne({
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
    // GET /api/nfl_bts/matchup (Guarded against undefined team)
    // --------------------------------------------------------
    app.get("/api/nfl_bts/matchup", requireAuth, async (req, res) => {
        try {
            const { week, team } = req.query;
            if (!team || team === "undefined" || team === "null") {
                return res.json(null);
            }

            const matchup = await NflBtsGames.findOne({
                where: {
                    week: parseInt(week),
                    [Op.or]: [{ home_team: team }, { away_team: team }]
                }
            });
            res.json(matchup || null);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch matchup" });
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

            const matchup = await NflBtsGames.findOne({
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
                    const teamMeta = await NflBtsTeams.findOne({ where: { name: teamName } });
                    if (teamMeta) teamLogo = teamMeta.logo;
                }

                // Get game details for their assigned team this week
                let game = null;
                if (teamName) {
                    game = await NflBtsGames.findOne({
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

                    const awayMeta = await NflBtsTeams.findOne({ where: { name: game.away_team } });
                    const homeMeta = await NflBtsTeams.findOne({ where: { name: game.home_team } });
                    if (awayMeta) awayLogo = awayMeta.logo;
                    if (homeMeta) homeLogo = homeMeta.logo;

                    if (favoriteTeam) {
                        const favMeta = await NflBtsTeams.findOne({ where: { name: favoriteTeam } });
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

};