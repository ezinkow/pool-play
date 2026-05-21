const syncPickem = require("../../services/tourney_pickem/sync.js");
const lockLines = require("../../jobs/tourney_pickem/lockLines.js");

module.exports = function (app) {
    app.post("/api/tourneypickem/admin/refresh-games", async (req, res) => {
        try {
            await syncPickem();
            await lockLines();
            res.json({ message: "Pickem refresh complete" });
        } catch (err) {
            console.error("Pickem refresh failed", err);
            res.status(500).json({ error: "Refresh failed" });
        }
    });
};