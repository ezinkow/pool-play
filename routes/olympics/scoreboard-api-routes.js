const { OlympicsRosterPicks } = require("../../models");
const getMedalMap = require("../../utils/olympics/getMadalMap");

module.exports = function (app) {
  app.get("/api/olympics/scoreboard", async (req, res) => {
    try {
      const teams = await OlympicsRosterPicks.findAll({ raw: true });
      const medalMap = await getMedalMap();

      const usersMap = {};

      teams.forEach((r) => {
        if (!usersMap[r.name]) {
          usersMap[r.name] = { name: r.name, countries: [], total: 0 };
        }

        const medal = medalMap[r.country_name] || {
          score: 0,
        };

        usersMap[r.name].countries.push({
          country_name: r.country_name,
          points: medal.score,
        });

        usersMap[r.name].total += medal.score;
      });

      const users = Object.values(usersMap).sort(
        (a, b) => b.total - a.total
      );

      res.json(users);
    } catch (err) {
      console.error("Failed to fetch scoreboard:", err);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });
};
