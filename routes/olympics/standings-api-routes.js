const { OlympicsRosterPicks } = require("../../models");
const getMedalMap = require("../../utils/olympics/getMadalMap");

module.exports = function (app) {
  app.get("/api/olympics/standings", async (req, res) => {
    try {
      const rosters = await OlympicsRosterPicks.findAll({ raw: true });
      const medalMap = await getMedalMap();

      const standingsMap = {};

      rosters.forEach((r) => {
        if (!standingsMap[r.name]) {
          standingsMap[r.name] = {
            name: r.name,
            total: 0,
            countries: [],
          };
        }

        const medal = medalMap[r.country_name] || {
          score: 0,
        };

        standingsMap[r.name].countries.push(
          `${r.country_name}: ${medal.score}`
        );

        standingsMap[r.name].total += medal.score;
      });

      const results = Object.values(standingsMap)
        .map((r) => ({
          name: r.name,
          total: r.total,
          country_list: r.countries.join("<br>"),
        }))
        .sort((a, b) => b.total - a.total);

      res.json(results);
    } catch (err) {
      console.error("Standings query failed:", err);
      res.status(500).json({ error: "Failed to load standings" });
    }
  });
};
