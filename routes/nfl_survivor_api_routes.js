const { NflSurvivorEntries, NflSurvivorPicks, NflRegularSeasonGames, NflTeams, Users, Settings } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const db = require("../models");
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

            // 1. Fetch the target game being picked/interacted with
            const game = await NflRegularSeasonGames.findByPk(game_id);
            if (!game) {
                return res.status(404).json({ error: "Game not found" });
            }

            // 2. RULE 2: Check if this specific game has started (Locks individual pick)
            if (game.game_date && new Date() >= new Date(game.game_date)) {
                return res.status(400).json({ error: "Cannot change or remove pick after this game has started!" });
            }

            // 3. Check if user already has an existing pick for this week
            const existingPick = await NflSurvivorPicks.findOne({
                where: { user_id: userId, week: week }
            });

            // If they already had a pick on a DIFFERENT game, check if *that* previous game started too
            if (existingPick && existingPick.game_id !== parseInt(game_id)) {
                const prevGame = await NflRegularSeasonGames.findByPk(existingPick.game_id);
                if (prevGame && prevGame.game_date && new Date() >= new Date(prevGame.game_date)) {
                    return res.status(400).json({ error: "Cannot switch picks; your previous pick's game has already started!" });
                }
            }

            // Toggle off / De-select check
            if (existingPick && existingPick.team_name === picked_team) {
                await existingPick.destroy();
                return res.json({ success: true, message: "Pick removed successfully", cleared: true });
            }

            // Upsert the new pick
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
            const currentUserId = req.user.id;
            const now = new Date();

            // 1. Fetch all survivor entries
            const entries = await NflSurvivorEntries.findAll();

            // 2. Fetch all survivor picks and all related games concurrently
            const allPicks = await NflSurvivorPicks.findAll();
            const allGames = await NflRegularSeasonGames.findAll();
            const gamesMap = {};
            allGames.forEach(g => { gamesMap[g.id] = g; });

            // 3. Group picks by user_id
            const picksByUser = {};
            allPicks.forEach(pick => {
                if (!picksByUser[pick.user_id]) {
                    picksByUser[pick.user_id] = [];
                }
                picksByUser[pick.user_id].push(pick);
            });

            const rosterResponse = entries.map(entry => {
                const picksMap = {};
                const userPicks = picksByUser[entry.user_id] || [];
                const isOwnEntry = Number(entry.user_id) === Number(currentUserId);

                userPicks.forEach(pick => {
                    const game = gamesMap[pick.game_id];
                    const gameStarted = game && game.game_date && now >= new Date(game.game_date);

                    if (isOwnEntry || gameStarted) {
                        picksMap[pick.week] = {
                            team_name: pick.team_name,
                            status: pick.status,
                            game_id: pick.game_id
                        };
                    } else {
                        picksMap[pick.week] = {
                            team_name: "🔒 Hidden",
                            status: "hidden",
                            game_id: pick.game_id
                        };
                    }
                });

                return {
                    user_id: entry.user_id,
                    entry_name: entry.entry_name || "Participant",
                    is_eliminated: entry.is_eliminated,
                    eliminated_week: entry.eliminated_week,
                    picks: picksMap
                };
            });

            res.json(rosterResponse);
        } catch (err) {
            console.error("Error fetching survivor roster:", err);
            res.status(500).json({ error: "Failed to load roster" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_survivor/settings (Fetch survivor pool active week dynamically)
    // --------------------------------------------------------
    app.get("/api/nfl_survivor/settings", requireAuth, async (req, res) => {
        try {
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            const setting = SettingsModel ? await SettingsModel.findOne({ where: { game_key: "nfl_survivor" } }) : null;

            // Dynamic week calculator fallback
            const now = new Date();
            const weeks = [
                { week: 1, start: new Date("2026-09-09T00:00:00"), end: new Date("2026-09-15T23:59:59") },
                { week: 2, start: new Date("2026-09-16T00:00:00"), end: new Date("2026-09-22T23:59:59") },
                { week: 3, start: new Date("2026-09-23T00:00:00"), end: new Date("2026-09-29T23:59:59") },
                { week: 4, start: new Date("2026-09-30T00:00:00"), end: new Date("2026-10-06T23:59:59") },
                { week: 5, start: new Date("2026-10-07T00:00:00"), end: new Date("2026-10-13T23:59:59") },
                { week: 6, start: new Date("2026-10-14T00:00:00"), end: new Date("2026-10-20T23:59:59") },
                { week: 8, start: new Date("2026-10-21T00:00:00"), end: new Date("2026-10-27T23:59:59") },
                { week: 9, start: new Date("2026-10-28T00:00:00"), end: new Date("2026-11-03T23:59:59") },
                { week: 10, start: new Date("2026-11-04T00:00:00"), end: new Date("2026-11-10T23:59:59") },
                { week: 11, start: new Date("2026-11-11T00:00:00"), end: new Date("2026-11-17T23:59:59") },
                { week: 12, start: new Date("2026-11-18T00:00:00"), end: new Date("2026-11-24T23:59:59") },
                { week: 13, start: new Date("2026-11-25T00:00:00"), end: new Date("2026-12-01T23:59:59") },
                { week: 14, start: new Date("2026-12-02T00:00:00"), end: new Date("2026-12-08T23:59:59") },
                { week: 15, start: new Date("2026-12-09T00:00:00"), end: new Date("2026-12-15T23:59:59") },
                { week: 16, start: new Date("2026-12-16T00:00:00"), end: new Date("2026-12-22T23:59:59") },
                { week: 17, start: new Date("2026-12-23T00:00:00"), end: new Date("2026-12-29T23:59:59") },
                { week: 18, start: new Date("2026-12-30T00:00:00"), end: new Date("2027-01-05T23:59:59") }
            ];

            let activeIndex = 0;
            for (let i = weeks.length - 1; i >= 0; i--) {
                if (now >= weeks[i].start) {
                    activeIndex = i;
                    break;
                }
            }
            const dynamicWeek = weeks[activeIndex].week;

            return res.json({
                current_week: setting?.current_week || dynamicWeek,
                is_active: setting ? setting.is_active : true,
                title: setting?.title || "NFL Survivor"
            });
        } catch (err) {
            console.error("Failed to fetch survivor settings:", err);
            return res.status(500).json({ error: "Failed to load survivor settings" });
        }
    });
};