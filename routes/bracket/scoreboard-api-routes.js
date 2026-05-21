const { GamesBracket } = require("../../models");

module.exports = function (app) {
    app.get("/api/bracket/games/history", async (req, res) => {
        try {
            const games = await GamesBracket.findAll({
                order: [["round", "ASC"], ["bracket_slot", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch bracket games" });
        }
    });
};