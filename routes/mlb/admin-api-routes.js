const syncMlb = require("../../syncs/mlb/sync.js");

module.exports = function (app) {

    // POST /api/mlb/admin/refresh — manually trigger ESPN sync
    app.post("/api/mlb/admin/refresh", async (req, res) => {
        try {
            await syncMlb();
            res.json({ success: true, message: "NBA sync complete" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Sync failed", detail: err.message });
        }
    });
};