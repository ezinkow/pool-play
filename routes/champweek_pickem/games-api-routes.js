const { ChampWeekPickemGames } = require("../../models");

module.exports = function (app) {
    app.get("/api/champweek/games", async (req, res) => {
        try {
            const games = await ChampWeekPickemGames.findAll();
            res.json(games);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load games" });
        }
    });
};