// Requiring our models
const { NflPlayerPools } = require("../../models");

module.exports = function (app) {
  // ----------------------------------
  // GET all NflPlayerPools
  // ----------------------------------
  app.get("/api/nfl/playerpools", async (req, res) => {
    try {
      const rows = await NflPlayerPools.findAll({ raw: true });

      const parseScore = (val) => {
        const num = parseFloat(val);
        return Number.isFinite(num) ? num : 0;
      };

      const formatted = rows.map((player) => {
        const wild = parseScore(player.wild_card_score);
        const div = parseScore(player.divisional_score);
        const conf = parseScore(player.conf_championship_score);
        const sb = parseScore(player.super_bowl_score);

        return {
          id: player.id,
          player_name: player.player_name,
          team: player.team,
          position: player.position,
          tier: player.tier,
          eliminated: player.eliminated ?? null, // ✅ CRITICAL
          times_selected: player.times_selected ?? 0,

          wild_card_score: wild,
          divisional_score: div,
          conf_championship_score: conf,
          super_bowl_score: sb,

          total_points: wild + div + conf + sb,
        };
      });

      // Optional: sort by total points (used by scoreboard, harmless elsewhere)
      formatted.sort((a, b) => b.total_points - a.total_points);

      res.json(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch player pools:", err);
      res.status(500).json({ error: "Failed to fetch player pools" });
    }
  });
};
