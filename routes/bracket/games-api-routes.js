const { GamesBracket } = require("../../models");
const { Op } = require("sequelize");

module.exports = function (app) {

    app.get("/api/bracket/games", async (req, res) => {
        try {
            const games = await GamesBracket.findAll({
                order: [["round", "ASC"], ["bracket_slot", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load bracket games" });
        }
    });

    app.get("/api/bracket/games/finishedAndInProgress", async (req, res) => {
        try {
            const games = await GamesBracket.findAll({
                where: {
                    status: {
                        [Op.in]: ["STATUS_FINAL", "STATUS_IN_PROGRESS", "STATUS_HALFTIME"]
                    }
                },
                order: [["round", "ASC"], ["bracket_slot", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load bracket games" });
        }
    });
};