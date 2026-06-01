const { WorldCupMatches } = require("../../models");

module.exports = function (app) {
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

  app.get("/api/worldcup/countries", async (req, res) => {
    try {
      // Fetch all matches that are group stage (round 0)
      const matches = await WorldCupMatches.findAll({
        where: { round: 0 }
      });

      const countryStats = {};

      // Helper to initialize a country row object if it doesn't exist yet
      const initCountry = (name, logo) => {
        if (!countryStats[name]) {
          countryStats[name] = {
            id: name, // Use name as a unique key for React loops
            country_name: name,
            country_logo: logo,
            tier: 1, // Optional: default fallback if you aren't using tiers
            gs_wins: 0,
            gs_ties: 0,
            ko_wins: 0,
            total_points: 0
          };
        }
      };

      // Loop through matches and aggregate numbers
      matches.forEach(m => {
        if (!m.home_team || !m.away_team) return;

        initCountry(m.home_team, m.home_logo);
        initCountry(m.away_team, m.away_logo);

        if (m.status === "STATUS_FINAL") {
          if (m.result === "Home") {
            countryStats[m.home_team].gs_wins += 1;
            countryStats[m.home_team].total_points += 2; // 2pts for a win
          } else if (m.result === "Away") {
            countryStats[m.away_team].gs_wins += 1;
            countryStats[m.away_team].total_points += 2;
          } else if (m.result === "Draw") {
            countryStats[m.home_team].gs_ties += 1;
            countryStats[m.away_team].gs_ties += 1;
            countryStats[m.home_team].total_points += 1; // 1pt for a tie
            countryStats[m.away_team].total_points += 1;
          }
        }
      });

      // Convert the map back to a flat array for the frontend table
      res.json(Object.values(countryStats));
    } catch (err) {
      console.error("❌ Aggregated Countries GET Error:", err);
      res.status(500).json(err);
    }
  });
};