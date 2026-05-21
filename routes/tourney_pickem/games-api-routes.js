const { TourneyPickemGames } = require("../../models");

module.exports = function (app) {

    app.get("/api/tourneypickem/games", async (req, res) => {
        try {
            const games = await TourneyPickemGames.findAll({
                order: [["game_date", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load games" });
        }
    });

    // Find picks_display where set to visible
    app.get('/api/tourneypickem/games/finishedAndInProgress', function (req, res) {
        TourneyPickemGames.findAll({
            where: {
                status: ['STATUS_FINAL', 'STATUS_IN_PROGRESS', 'STATUS_HALFTIME']
            }
        })
            .then(function (dbgames) {
                res.json(dbgames)
            })
    })
};