const { WorldCupMatches } = require("../../models");

module.exports = function (app) {
  const COMPLETED_STATUSES = ["STATUS_FULL_TIME", "STATUS_FINAL", "FINAL", "STATUS_FINAL_PEN"];
  // Helper to check if a game is finished
  const isGameFinal = (status) => COMPLETED_STATUSES.includes(status);

  // ----------------------------------
  // GET all matches (The Schedule)
  // ----------------------------------
  app.get("/api/worldcup/matches", async (req, res) => {
    try {
      const matches = await WorldCupMatches.findAll({
        order: [["game_date", "ASC"]]
      });
      res.json(matches);
    } catch (err) {
      console.error("❌ Matches GET Error:", err);
      res.status(500).json(err);
    }
  });
};