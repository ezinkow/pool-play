const { SyncStatus, GameSettings, Users } = require("../../models");
const requireAuth = require("../../middleware/Requireauth");

module.exports = function (app) {
    // GET /api/admin/data — retrieve all sync controls & game settings (Admin Only)
    app.get("/api/admin/data", requireAuth, async (req, res) => {
        try {
            const user = await Users.findByPk(req.user.id);
            if (!user || !user.is_admin) {
                return res.status(403).json({ error: "Access denied. Administrator privileges required." });
            }

            const statuses = await SyncStatus.findAll({
                order: [["sync_file_route", "ASC"]]
            });
            
            const gameSettings = await GameSettings.findAll({
                order: [["game_key", "ASC"]]
            });

            res.json({ statuses, gameSettings });
        } catch (err) {
            console.error("Error fetching admin data:", err);
            res.status(500).json({ error: "Failed to load admin dashboard data" });
        }
    });

    // POST /api/admin/sync-status — update a sync's enabled state
    app.post("/api/admin/sync-status", requireAuth, async (req, res) => {
        try {
            const user = await Users.findByPk(req.user.id);
            if (!user || !user.is_admin) {
                return res.status(403).json({ error: "Access denied. Administrator privileges required." });
            }

            const { sync_file_route, sync_enabled } = req.body;
            if (!sync_file_route) {
                return res.status(400).json({ error: "sync_file_route is required" });
            }

            const [record, created] = await SyncStatus.findOrCreate({
                where: { sync_file_route },
                defaults: { sync_enabled: sync_enabled ?? false }
            });

            if (!created) {
                if (sync_enabled !== undefined) record.sync_enabled = sync_enabled;
                await record.save();
            }

            res.json({ success: true, record });
        } catch (err) {
            console.error("Error updating sync status:", err);
            res.status(500).json({ error: "Failed to update sync status" });
        }
    });

    // POST /api/admin/game-settings — update game settings fields (including is_active)
    app.post("/api/admin/game-settings", requireAuth, async (req, res) => {
        try {
            const user = await Users.findByPk(req.user.id);
            if (!user || !user.is_admin) {
                return res.status(403).json({ error: "Access denied. Administrator privileges required." });
            }

            const { game_key, updates } = req.body;
            if (!game_key || !updates) {
                return res.status(400).json({ error: "game_key and updates object are required" });
            }

            const setting = await GameSettings.findOne({ where: { game_key } });
            if (!setting) {
                return res.status(404).json({ error: "Game setting not found" });
            }

            await setting.update(updates);
            res.json({ success: true, setting });
        } catch (err) {
            console.error("Error updating game settings:", err);
            res.status(500).json({ error: "Failed to update game settings" });
        }
    });
};