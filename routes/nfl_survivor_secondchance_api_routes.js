const { NflSurvivorSecondChanceEntries, NflSurvivorSecondChancePicks, NflRegularSeasonGames, Settings } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const db = require("../models");
const { Op } = require("sequelize");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Entry Status
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor_secondchance/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await NflSurvivorSecondChanceEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("❌ Error fetching 2nd Chance Survivor entry status:", err);
            res.status(500).json({ error: "Failed to fetch entry status" });
        }
    });

    // ------------------------------------------------------------------
    // 2. POST Create / Join 2nd Chance Survivor Pool
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor_secondchance/entries/create", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_survivor_secondchance" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. Cannot join." });
                }
            }

            const nameTaken = await NflSurvivorSecondChanceEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const existingEntry = await NflSurvivorSecondChanceEntries.findOne({
                where: { user_id: req.user.id }
            });

            if (existingEntry) {
                return res.status(400).json({ error: "You are already entered in the 2nd Chance Survivor pool" });
            }

            const entry = await NflSurvivorSecondChanceEntries.create({
                user_id: req.user.id,
                entry_name
            });

            res.json({ success: true, entry });
        } catch (err) {
            console.error("2nd Chance Survivor entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 3. POST Leave 2nd Chance Survivor Pool
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor_secondchance/entries/leave", requireAuth, async (req, res) => {
        try {
            if (Settings && typeof Settings.findOne === "function") {
                const poolSetting = await Settings.findOne({ where: { game_key: "nfl_survivor_secondchance" } });
                if (poolSetting && poolSetting.lock_date && new Date() >= new Date(poolSetting.lock_date)) {
                    return res.status(403).json({ error: "The pool has already started. You cannot leave." });
                }
            }

            const deletedCount = await NflSurvivorSecondChanceEntries.destroy({
                where: { user_id: req.user.id }
            });

            if (deletedCount === 0) {
                return res.status(404).json({ error: "Entry not found" });
            }

            // Also clean up any picks made by this user
            await NflSurvivorSecondChancePicks.destroy({
                where: { user_id: req.user.id }
            });

            res.json({ success: true });
        } catch (err) {
            console.error("Leave 2nd Chance Survivor pool error:", err);
            res.status(500).json({ error: "Failed to leave the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 4. GET All Entries (Public)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor_secondchance/entries", async (req, res) => {
        try {
            const entries = await NflSurvivorSecondChanceEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "is_eliminated", "eliminated_week", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            console.error("Failed to load 2nd Chance Survivor entries:", err);
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // --------------------------------------------------------
    // 5. GET /api/nfl_survivor_secondchance/picks (Get weekly games & user picks)
    // --------------------------------------------------------
    app.get("/api/nfl_survivor_secondchance/picks", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            // 1. Fetch regular season games for the requested week
            const games = await NflRegularSeasonGames.findAll({
                where: { week: week },
                order: [["game_date", "ASC"]]
            });

            // 2. Fetch all picks made by this user across all weeks using user_id
            const allPicks = await NflSurvivorSecondChancePicks.findAll({
                where: { user_id: req.user.id }
            });

            let userPicksMap = {};
            let usedTeamsArr = [];

            allPicks.forEach(pick => {
                userPicksMap[pick.week] = pick.team_name;
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
            console.error("Error fetching 2nd Chance Survivor picks data:", err);
            res.status(500).json({ error: "Failed to fetch 2nd Chance Survivor picks" });
        }
    });

    // ------------------------------------------------------------------
    // 6. GET All Past Picks for User (to validate team reuse on frontend)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor_secondchance/picks/all", requireAuth, async (req, res) => {
        try {
            const picks = await NflSurvivorSecondChancePicks.findAll({
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
    // POST /api/nfl_survivor_secondchance/picks (Make or Clear a 2nd Chance Survivor Pick)
    // ------------------------------------------------------------------
    app.post("/api/nfl_survivor_secondchance/picks", requireAuth, async (req, res) => {
        try {
            const { week, game_id, picked_team } = req.body;
            const userId = req.user.id;

            // 1. STRICT ELIMINATION CHECK (Check both flag and any explicit elimination records)
            const entry = await NflSurvivorSecondChanceEntries.findOne({ where: { user_id: userId } });
            if (!entry) {
                return res.status(400).json({ error: "No 2nd Chance Survivor entry found for this user." });
            }
            if (entry.is_eliminated) {
                return res.status(400).json({ error: "Cannot make or modify picks after being eliminated!" });
            }

            // 2. Fetch the target game
            const game = await NflRegularSeasonGames.findByPk(game_id);
            if (!game) {
                return res.status(404).json({ error: "Game not found" });
            }

            // 3. Check if this specific game has started
            if (game.game_date && new Date() >= new Date(game.game_date)) {
                return res.status(400).json({ error: "Cannot change or remove pick after this game has started!" });
            }

            // 4. Check if user already has an existing pick for this week
            const existingPick = await NflSurvivorSecondChancePicks.findOne({
                where: { user_id: userId, week: week }
            });

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
                await NflSurvivorSecondChancePicks.create({
                    user_id: userId,
                    week: week,
                    game_id: game_id,
                    team_name: picked_team,
                    status: "pending"
                });
            }

            res.json({ success: true, message: `Locked in pick: ${picked_team}` });
        } catch (err) {
            console.error("Error saving 2nd Chance Survivor pick:", err);
            res.status(500).json({ error: "Failed to save pick" });
        }
    });

    // ------------------------------------------------------------------
    // 8. GET Master Roster Dashboard Data (Who's In, Who's Out, History)
    // ------------------------------------------------------------------
    app.get("/api/nfl_survivor_secondchance/roster", requireAuth, async (req, res) => {
        try {
            const currentUserId = req.user.id;
            const now = new Date();

            // 1. Fetch all 2nd Chance Survivor entries
            const entries = await NflSurvivorSecondChanceEntries.findAll();

            // 2. Fetch all 2nd Chance Survivor picks and all related games concurrently
            const allPicks = await NflSurvivorSecondChancePicks.findAll();
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
            console.error("Error fetching 2nd Chance Survivor roster:", err);
            res.status(500).json({ error: "Failed to load roster" });
        }
    });
};