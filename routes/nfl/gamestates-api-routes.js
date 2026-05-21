const { NflGameStates } = require("../../models");

module.exports = function (app) {
  app.get("/api/nfl/gamestates", async (req, res) => {
    try {
      const state = await NflGameStates.findOne({
        order: [["id", "DESC"]],
      });

      res.json(state);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load game state" });
    }
  });
};
