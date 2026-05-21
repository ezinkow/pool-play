const { WorldCupGameStates } = require("../../models");

module.exports = function (app) {
  app.get("/api/worldcup/gamestates", async (req, res) => {
    try {
      const state = await WorldCupGameStates.findOne({
        order: [["id", "DESC"]],
      });

      res.json(state);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load game state" });
    }
  });
};
