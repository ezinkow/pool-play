// Requiring our models
const { OlympicsCountryPools } = require("../../models");

module.exports = function (app) {
  // ----------------------------------
  // GET all OlympicsCountryPools
  // ----------------------------------
  app.get("/api/olympics/countrypools", async (req, res) => {
    try {
      const rows = await OlympicsCountryPools.findAll({ raw: true });
      const formatted = rows.map((country) => {
        const gold = Number(country.gold) || 0;
        const silver = Number(country.silver) || 0;
        const bronze = Number(country.bronze) || 0;
        const price = Number(country.price) || 0;

        return {
          id: country.id,
          country_name: country.country_name,
          gold,
          silver,
          bronze,
          price,
          times_selected: Number(country.times_selected) || 0,
        };
      });

      // Optional: sort by price or score
      formatted.sort((a, b) => b.price - a.price);

      res.json(formatted);
    } catch (err) {
      console.error("❌ Failed to fetch country pools:", err);
      res.status(500).json({ error: "Failed to fetch country pools" });
    }
  });
};
