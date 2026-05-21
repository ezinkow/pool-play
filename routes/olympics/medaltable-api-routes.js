module.exports = function (app) {
  app.get("/api/olympics/medaltable", async (req, res) => {
    const url =
      "https://site.web.api.espn.com/apis/site/v2/olympics/winter/2026/medals?region=us&lang=en";

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data.medals)) {
        return res.status(500).json({
          error: "Unexpected ESPN medal format",
        });
      }

      const normalized = data.medals.map((c) => ({
        country_name: c.displayName,
        code: c.abbreviation,
        flag: c.flag?.href,
        gold: c.medalStandings?.goldMedalCount || 0,
        silver: c.medalStandings?.silverMedalCount || 0,
        bronze: c.medalStandings?.bronzeMedalCount || 0,
        total: c.medalStandings?.totalMedals || 0,
        score: (c.medalStandings?.goldMedalCount*3+c.medalStandings?.silverMedalCount*2+c.medalStandings?.bronzeMedalCount) || 0,
      }));

      res.json(normalized);
    } catch (err) {
      console.error("ESPN medal API error:", err);
      res.status(500).json({ error: "Failed to fetch medal table" });
    }
  });
};
