const { NflPlayoffsPlayers, PoolSettings } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const db = require("../models");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/nfl_playoffs/players (Master player pool & stats)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs/players", requireAuth, async (req, res) => {
        try {
            const onlyActive = req.query.active === "true";
            const PlayerModel = NflPlayoffsPlayers || db.NflPlayoffsPlayers || db.NflPlayers;

            if (!PlayerModel) {
                return res.json({ players: [] });
            }

            const whereClause = onlyActive ? { is_eliminated: false } : {};
            const players = await PlayerModel.findAll({
                where: whereClause,
                order: [["position", "ASC"], ["total_points", "DESC"], ["name", "ASC"]]
            });

            res.json({ players });
        } catch (err) {
            console.error("Error fetching master playoff players:", err);
            res.status(500).json({ error: "Failed to fetch master player pool" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_playoffs/players/sync (Admin/Cron sync for player stats & elimination status)
    // --------------------------------------------------------
    app.post("/api/nfl_playoffs/players/sync", requireAuth, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Unauthorized admin action." });
            }

            const { players } = req.body; // Expects an array of player stat objects from external provider
            if (!Array.isArray(players)) {
                return res.status(400).json({ error: "Invalid players payload." });
            }

            const PlayerModel = NflPlayoffsPlayers || db.NflPlayoffsPlayers;
            for (const p of players) {
                await PlayerModel.upsert({
                    player_id: p.player_id,
                    name: p.name,
                    position: p.position,
                    team: p.team,
                    opponent: p.opponent,
                    is_eliminated: p.is_eliminated || false,
                    points_round_1: p.points_round_1 || 0.0,
                    points_round_2: p.points_round_2 || 0.0,
                    points_round_3: p.points_round_3 || 0.0,
                    points_round_4: p.points_round_4 || 0.0,
                    total_points: p.total_points || 0.0
                });
            }

            res.json({ success: true, message: "Player stats synchronized successfully!" });
        } catch (err) {
            console.error("Error syncing master playoff player stats:", err);
            res.status(500).json({ error: "Failed to sync player stats" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_playoffs/settings (Global playoff metadata/current round)
    // --------------------------------------------------------
    app.get("/api/nfl_playoffs/settings", requireAuth, async (req, res) => {
        try {
            const SettingsModel = db.PoolSettings || db.gameSettings;
            const setting = SettingsModel ? await SettingsModel.findOne({ where: { game_key: "nfl_playoffs_pick_three" } }) : null;
            res.json({
                current_week: setting?.current_week || 1,
                lock_date: setting?.lock_date || null
            });
        } catch (err) {
            console.error("Error fetching global playoff settings:", err);
            res.status(500).json({ error: "Failed to fetch global playoff settings" });
        }
    });

};