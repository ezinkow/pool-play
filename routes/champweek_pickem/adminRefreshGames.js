// adminRefreshGames.js
const syncGames = require("../../syncs/champweek_pickem/sync");
const lockLines = require("../../jobs/champweek_pickem/lockLines");

module.exports = function (app) {
  app.post("/api/champweek/admin/refresh-games", async (req, res) => {
    try {
      await syncGames();
      await lockLines();
      res.json({ message: "Refresh complete" });
    } catch (err) {
      console.error("Refresh games failed", err);
      res.status(500).json({ error: "Refresh failed" });
    }
  });
};