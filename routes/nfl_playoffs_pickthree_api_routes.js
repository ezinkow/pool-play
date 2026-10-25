const { NflPlayoffsPickThreePicks, NflPlayoffsPickThreeEntries, NflPlayoffsPlayers, PoolSettings } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const db = require("../models");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/settings
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/settings", requireAuth, async (req, res) => {
        try {
            const SettingsModel = db.PoolSettings || db.gameSettings || db.GameSetting;
            const setting = SettingsModel ? await SettingsModel.findOne({ where: { game_key: "nfl_playoffs_pick_three" } }) : null;
            res.json({
                current_week: setting?.current_week || 1,
                games_api_path: "/api/nfl_playoffs_pickthree/games"
            });
        } catch (err) {
            console.error("Error fetching pick three settings:", err);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/entries/me (Fetch all user entries)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/entries/me", requireAuth, async (req, res) => {
        try {
            const entries = await NflPlayoffsPickThreeEntries.findAll({
                where: { user_id: req.user.id }
            });
            res.json({ entries: entries || [], entry: entries[0] || null });
        } catch (err) {
            console.error("Error fetching playoffs pick three entries:", err);
            res.status(500).json({ error: "Failed to fetch entries" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_playoffs_pickthree/entries/create (Create a new entry / join pool)
    // --------------------------------------------------------
    app.post("/api/nfl_playoffs_pickthree/entries/create", requireAuth, async (req, res) => {
        try {
            const { entry_name } = req.body;
            const existingCount = await NflPlayoffsPickThreeEntries.count({
                where: { user_id: req.user.id }
            });
            const finalName = entry_name?.trim() || `${req.user.name || "Player"} Entry ${existingCount + 1}`;

            const entry = await NflPlayoffsPickThreeEntries.create({
                user_id: req.user.id,
                entry_name: finalName
            });

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Error creating playoffs pick three entry:", err);
            res.status(500).json({ error: "Failed to create entry" });
        }
    });

   // --------------------------------------------------------
    // POST /api/nfl_playoffs_pickthree/entries/leave (Leave pool / remove entry)
    // --------------------------------------------------------
    app.post("/api/nfl_playoffs_pickthree/entries/leave", requireAuth, async (req, res) => {
        const t = await db.sequelize.transaction();
        try {
            const targetId = req.body.id || req.body.entry_id;
            
            let entry = null;
            if (targetId && !isNaN(targetId)) {
                entry = await NflPlayoffsPickThreeEntries.findOne({
                    where: { id: targetId, user_id: req.user.id },
                    transaction: t
                });
            }

            // Fallback: if no valid ID was passed, grab the user's latest entry
            if (!entry) {
                entry = await NflPlayoffsPickThreeEntries.findOne({
                    where: { user_id: req.user.id },
                    order: [["createdAt", "DESC"]],
                    transaction: t
                });
            }

            if (entry) {
                await NflPlayoffsPickThreePicks.destroy({
                    where: { user_id: req.user.id },
                    transaction: t
                });
                await entry.destroy({ transaction: t });
            }

            await t.commit();
            res.json({ success: true, message: "Successfully removed entry." });
        } catch (err) {
            await t.rollback();
            console.error("Error leaving playoffs pick three pool:", err);
            res.status(500).json({ error: "Failed to remove entry" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/picks (Fetch user picks for a round)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/picks", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            const picks = await NflPlayoffsPickThreePicks.findAll({
                where: { user_id: req.user.id, week }
            });

            const playerIds = picks.map(p => p.player_id).filter(Boolean);
            const PlayerModel = NflPlayoffsPlayers || db.NflPlayoffsPlayers || db.NflPlayers;
            let playerMap = {};

            if (PlayerModel && playerIds.length > 0) {
                const foundPlayers = await PlayerModel.findAll({
                    where: { id: { [Op.in]: playerIds } }
                });
                foundPlayers.forEach(pl => {
                    playerMap[pl.id] = pl;
                });
            }

            const pickMap = { qb: null, rb: null, wr: null };
            picks.forEach(p => {
                const player = playerMap[p.player_id];
                if (player) {
                    const playerData = {
                        id: player.id,
                        name: player.name,
                        position: player.position,
                        team: player.team,
                        opponent: player.opponent
                    };
                    if (p.position === "QB") pickMap.qb = playerData;
                    if (p.position === "RB") pickMap.rb = playerData;
                    if (p.position === "WR" || p.position === "TE") pickMap.wr = playerData;
                }
            });

            res.json({ picks: pickMap });
        } catch (err) {
            console.error("Error fetching round picks:", err);
            res.status(500).json({ error: "Failed to fetch picks" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/used_players (Get already used players)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/used_players", requireAuth, async (req, res) => {
        try {
            const allUserPicks = await NflPlayoffsPickThreePicks.findAll({
                where: { user_id: req.user.id }
            });

            const usedPlayerIds = allUserPicks.map(p => p.player_id);
            res.json({ used_players: usedPlayerIds });
        } catch (err) {
            console.error("Error fetching used players:", err);
            res.status(500).json({ error: "Failed to fetch used players" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_playoffs_pickthree/picks (Save round selections)
    // --------------------------------------------------------
    app.post("/api/nfl_playoffs_pickthree/picks", requireAuth, async (req, res) => {
        const t = await db.sequelize.transaction();
        try {
            const { week, qb_id, rb_id, wr_id } = req.body;
            const targetWeek = parseInt(week) || 1;

            if (!qb_id || !rb_id || !wr_id) {
                await t.rollback();
                return res.status(400).json({ error: "Missing required selection parameters." });
            }

            const entry = await NflPlayoffsPickThreeEntries.findOne({
                where: { user_id: req.user.id },
                transaction: t
            });

            if (!entry) {
                await t.rollback();
                return res.status(403).json({ error: "You must join the pool before making picks." });
            }

            // Verify single-use rule across other rounds
            const existingPicks = await NflPlayoffsPickThreePicks.findAll({
                where: { user_id: req.user.id, week: { [Op.ne]: targetWeek } },
                transaction: t
            });
            const usedIds = new Set(existingPicks.map(p => p.player_id));

            if (usedIds.has(qb_id) || usedIds.has(rb_id) || usedIds.has(wr_id)) {
                await t.rollback();
                return res.status(400).json({ error: "One or more selected players have already been used in a previous round!" });
            }

            // Clear existing picks for this week
            await NflPlayoffsPickThreePicks.destroy({
                where: { user_id: req.user.id, week: targetWeek },
                transaction: t
            });

            // Save new picks with user_id and week explicitly set
            await NflPlayoffsPickThreePicks.bulkCreate([
                { user_id: req.user.id, week: targetWeek, player_id: qb_id, position: "QB" },
                { user_id: req.user.id, week: targetWeek, player_id: rb_id, position: "RB" },
                { user_id: req.user.id, week: targetWeek, player_id: wr_id, position: "WR" }
            ], { transaction: t });

            await t.commit();
            res.json({ success: true, message: "Round selections saved successfully!" });
        } catch (err) {
            await t.rollback();
            console.error("Error saving round picks:", err);
            res.status(500).json({ error: "Failed to save picks" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/mypicks (Fetch historical picks)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/mypicks", requireAuth, async (req, res) => {
        try {
            const picks = await NflPlayoffsPickThreePicks.findAll({
                where: { user_id: req.user.id }
            });

            const playerIds = picks.map(p => p.player_id).filter(Boolean);
            const PlayerModel = NflPlayoffsPlayers || db.NflPlayoffsPlayers || db.NflPlayers;
            let playerMap = {};

            if (PlayerModel && playerIds.length > 0) {
                const foundPlayers = await PlayerModel.findAll({
                    where: { id: { [Op.in]: playerIds } }
                });
                foundPlayers.forEach(pl => {
                    playerMap[pl.id] = pl;
                });
            }

            const roundsMap = {};
            [1, 2, 3, 4].forEach(w => {
                roundsMap[w] = { qb: null, rb: null, wr: null, total_points: 0 };
            });

            picks.forEach(p => {
                const w = p.week;
                if (!roundsMap[w]) roundsMap[w] = { qb: null, rb: null, wr: null, total_points: 0 };
                
                const player = playerMap[p.player_id];
                const playerData = player ? {
                    name: player.name,
                    team: player.team,
                    opponent: player.opponent,
                    points: p.week === 1 ? player.points_round_1 : p.week === 2 ? player.points_round_2 : p.week === 3 ? player.points_round_3 : p.week === 4 ? player.points_round_4 : (player.points || 0)
                } : null;

                if (p.position === "QB") roundsMap[w].qb = playerData;
                if (p.position === "RB") roundsMap[w].rb = playerData;
                if (p.position === "WR" || p.position === "TE") roundsMap[w].wr = playerData;

                roundsMap[w].total_points += (playerData?.points || 0);
            });

            res.json({ rounds: roundsMap });
        } catch (err) {
            console.error("Error fetching historical picks:", err);
            res.status(500).json({ error: "Failed to load pick summary" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/matrix (Fetch group matrix for a round)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/matrix", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name,
                    p.week,
                    p.position,
                    p.player_id,
                    pl.name as player_name,
                    pl.team,
                    pl.opponent,
                    CASE 
                        WHEN :week = 1 THEN pl.points_round_1
                        WHEN :week = 2 THEN pl.points_round_2
                        WHEN :week = 3 THEN pl.points_round_3
                        WHEN :week = 4 THEN pl.points_round_4
                        ELSE pl.points
                    END as points
                FROM nfl_playoffs_pickthree_entries e
                LEFT JOIN nfl_playoffs_pickthree_picks p ON e.user_id = p.user_id AND p.week = :week
                LEFT JOIN nfl_playoffs_players pl ON p.player_id = pl.id
                ORDER BY e.entry_name ASC;
            `;

            const [picks] = await db.sequelize.query(query, {
                replacements: { week }
            }).catch(() => [[]]);

            res.json({ picks: picks || [] });
        } catch (err) {
            console.error("Error fetching group matrix:", err);
            res.status(500).json({ error: "Failed to fetch group matrix" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs_pickthree/standings (Leaderboard)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs_pickthree/standings", requireAuth, async (req, res) => {
        try {
            const SettingsModel = db.PoolSettings || db.gameSettings || db.GameSetting;
            const setting = SettingsModel ? await SettingsModel.findOne({ where: { game_key: "nfl_playoffs_pick_three" } }) : null;
            const currentWeek = setting?.current_week || 1;

            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name,
                    SUM(COALESCE(pl.points_round_1, 0)) as round_1_points,
                    SUM(COALESCE(pl.points_round_2, 0)) as round_2_points,
                    SUM(COALESCE(pl.points_round_3, 0)) as round_3_points,
                    SUM(COALESCE(pl.points_round_4, 0)) as round_4_points,
                    SUM(CASE WHEN p.week = :currentWeek THEN COALESCE(
                        CASE 
                            WHEN p.week = 1 THEN pl.points_round_1
                            WHEN p.week = 2 THEN pl.points_round_2
                            WHEN p.week = 3 THEN pl.points_round_3
                            WHEN p.week = 4 THEN pl.points_round_4
                            ELSE pl.points
                        END, 0) ELSE 0 END) as round_points,
                    SUM(COALESCE(
                        CASE 
                            WHEN p.week = 1 THEN pl.points_round_1
                            WHEN p.week = 2 THEN pl.points_round_2
                            WHEN p.week = 3 THEN pl.points_round_3
                            WHEN p.week = 4 THEN pl.points_round_4
                            ELSE pl.points
                        END, 0)) as total_points
                FROM nfl_playoffs_pickthree_entries e
                LEFT JOIN nfl_playoffs_pickthree_picks p ON e.user_id = p.user_id
                LEFT JOIN nfl_playoffs_players pl ON p.player_id = pl.id
                GROUP BY e.user_id, e.entry_name
                ORDER BY total_points DESC, entry_name ASC;
            `;

            const [standings] = await db.sequelize.query(query, {
                replacements: { currentWeek }
            }).catch(() => [[]]);

            res.json({ standings: standings || [] });
        } catch (err) {
            console.error("Error fetching pick three standings:", err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

};