const { NflSurvivorEntries, NflSurvivorPicks, NflRegularSeasonGames, NflTeams, Users, Settings } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Entry Status
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await NflSurvivorEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("❌ Error fetching survivor entry status:", err);
            res.status(500).json({ error: "Failed to fetch entry status" });
        }
    });

    // ------------------------------------------------------------------
    // 2. POST Create / Join Survivor Pool
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor/entries/create", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_survivor" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. Cannot join." });
                }
            }

            const nameTaken = await NflSurvivorEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const existingEntry = await NflSurvivorEntries.findOne({
                where: { user_id: req.user.id }
            });

            if (existingEntry) {
                return res.status(400).json({ error: "You are already entered in the survivor pool" });
            }

            const entry = await NflSurvivorEntries.create({
                user_id: req.user.id,
                entry_name
            });

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Survivor entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 3. POST Leave Survivor Pool
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor/entries/leave", requireAuth, async (req, res) => {
        try {
            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_survivor" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. You cannot leave." });
                }
            }

            const deletedCount = await NflSurvivorEntries.destroy({
                where: { user_id: req.user.id }
            });

            if (deletedCount === 0) {
                return res.status(404).json({ error: "Entry not found" });
            }

            // Also clean up any picks made by this user
            await NflSurvivorPicks.destroy({
                where: { user_id: req.user.id }
            });

            res.json({ success: true });
        } catch (err) {
            console.error("Leave survivor pool error:", err);
            res.status(500).json({ error: "Failed to leave the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 4. GET All Entries (Public)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor/entries", async (req, res) => {
        try {
            const entries = await NflSurvivorEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "is_eliminated", "eliminated_week", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            console.error("Failed to load survivor entries:", err);
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // --------------------------------------------------------
    // 5. GET /api/nfl_survivor/picks (Get weekly games & user picks)
    // --------------------------------------------------------
    app.get("/api/nfl_survivor/picks", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            // 1. Fetch regular season games for the requested week
            const games = await NflRegularSeasonGames.findAll({
                where: { week: week },
                order: [["game_date", "ASC"]]
            });

            // 2. Fetch all picks made by this user across all weeks using user_id
            const allPicks = await NflSurvivorPicks.findAll({
                where: { user_id: req.user.id }
            });

            let userPicksMap = {};
            let usedTeamsArr = [];

            allPicks.forEach(pick => {
                userPicksMap[pick.week] = pick.team_name; // Matches your column name
                if (pick.team_name) {
                    usedTeamsArr.push(pick.team_name);
                }
            });

            res.json({
                games: games || [],
                userPicks: userPicksMap,
                usedTeams: usedTeamsArr
            });
        } catch (err) {
            console.error("Error fetching survivor picks data:", err);
            res.status(500).json({ error: "Failed to fetch survivor picks" });
        }
    });

    // ------------------------------------------------------------------
    // 6. GET All Past Picks for User (to validate team reuse on frontend)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor/picks/all", requireAuth, async (req, res) => {
        try {
            const picks = await NflSurvivorPicks.findAll({
                where: { user_id: req.user.id },
                attributes: ["week", "team_name", "status"]
            });
            res.json(picks);
        } catch (err) {
            console.error("Error fetching user pick history:", err);
            res.status(500).json({ error: "Failed to fetch pick history" });
        }
    });

    // ------------------------------------------------------------------
    // POST /api/nfl_survivor/picks (Make or Clear a Survivor Pick)
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor/picks", requireAuth, async (req, res) => {
        try {
            const { week, game_id, picked_team } = req.body;
            const userId = req.user.id;

            // Check if user is already eliminated
            const entry = await NflSurvivorEntries.findOne({ where: { user_id: userId } });
            if (entry && entry.is_eliminated) {
                return res.status(400).json({ error: "Cannot make picks after being eliminated!" });
            }

            // Check if game has already started
            const game = await NflRegularSeasonGames.findByPk(game_id);
            if (!game) {
                return res.status(404).json({ error: "Game not found" });
            }

            if (game.game_date && new Date() >= new Date(game.game_date)) {
                return res.status(400).json({ error: "Cannot change pick after game has started!" });
            }

            // Check if user already has this exact team picked for this week (toggle off / de-select)
            const existingPick = await NflSurvivorPicks.findOne({
                where: { user_id: userId, week: week }
            });

            if (existingPick && existingPick.team_name === picked_team) {
                // De-select / Remove pick
                await existingPick.destroy();
                return res.json({ success: true, message: "Pick removed successfully", cleared: true });
            }

            // Otherwise, upsert the new pick
            if (existingPick) {
                existingPick.team_name = picked_team;
                existingPick.game_id = game_id;
                existingPick.status = "pending";
                await existingPick.save();
            } else {
                await NflSurvivorPicks.create({
                    user_id: userId,
                    week: week,
                    game_id: game_id,
                    team_name: picked_team,
                    status: "pending"
                });
            }

            res.json({ success: true, message: `Locked in pick: ${picked_team}` });
        } catch (err) {
            console.error("Error saving survivor pick:", err);
            res.status(500).json({ error: "Failed to save pick" });
        }
    });

    // ------------------------------------------------------------------
    // 8. GET Master Roster Dashboard Data (Who's In, Who's Out, History)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor/roster", requireAuth, async (req, res) => {
        try {
            const entries = await NflSurvivorEntries.findAll({
                raw: true
            });

            const allPicks = await NflSurvivorPicks.findAll({ raw: true });
            const allTeams = await NflTeams.findAll({ raw: true });

            const teamLogoMap = {};
            allTeams.forEach(t => {
                teamLogoMap[t.name] = t.logo;
            });

            // Group picks by user_id
            const picksByUser = {};
            allPicks.forEach(p => {
                if (!picksByUser[p.user_id]) {
                    picksByUser[p.user_id] = {};
                }
                picksByUser[p.user_id][p.week] = {
                    team_name: p.team_name,
                    logo: teamLogoMap[p.team_name] || null,
                    status: p.status
                };
            });

            const rosterData = entries.map(entry => ({
                user_id: entry.user_id,
                entry_name: entry.entry_name || "Unknown",
                is_eliminated: entry.is_eliminated,
                eliminated_week: entry.eliminated_week,
                picks: picksByUser[entry.user_id] || {}
            }));

            res.json(rosterData);
        } catch (err) {
            console.error("Error fetching survivor roster data:", err);
            res.status(500).json({ error: "Failed to load survivor roster" });
        }
    });
};