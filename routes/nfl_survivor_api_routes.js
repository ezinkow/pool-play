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
    // 7. POST Submit / Update Weekly Pick
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor/picks", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.body.week);
            const teamName = req.body.picked_team || req.body.team_name;

            if (!week || !teamName) {
                return res.status(400).json({ error: "Week and team name are required." });
            }

            // Check if user already used this team in a *different* week
            const existingUse = await NflSurvivorPicks.findOne({
                where: {
                    user_id: req.user.id,
                    team_name: teamName,
                    week: { [Op.ne]: week }
                }
            });

            if (existingUse) {
                return res.status(400).json({ error: `You have already used the ${teamName} in a previous week!` });
            }

            // Upsert the pick for this week
            let [pick, created] = await NflSurvivorPicks.findOrCreate({
                where: { user_id: req.user.id, week: week },
                defaults: { team_name: teamName, status: "pending" }
            });

            if (!created) {
                pick.team_name = teamName;
                await pick.save();
            }

            res.json({ success: true, pick });
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