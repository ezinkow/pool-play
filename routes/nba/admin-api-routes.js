const syncNba = require("../../services/nba/sync.js");

module.exports = function (app) {

    // POST /api/nba/admin/refresh — manually trigger ESPN sync
    app.post("/api/nba/admin/refresh", async (req, res) => {
        try {
            await syncNba();
            res.json({ success: true, message: "NBA sync complete" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Sync failed", detail: err.message });
        }
    });
};