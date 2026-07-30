const { NflRegularSeasonGames } = require("../models");
const db = require("../models");
const { Op } = require("sequelize");
const requireAuth = require("../middleware/Requireauth");

module.exports = function (app) {
    // --------------------------------------------------------
    // GET /api/nfl_regular_season_games (Guarded against undefined team)
    // --------------------------------------------------------
    app.get("/api/nfl_regular_season_games", requireAuth, async (req, res) => {
        try {
            const { week, team } = req.query;
            if (!team || team === "undefined" || team === "null") {
                return res.json(null);
            }

            const matchup = await NflRegularSeasonGames.findOne({
                where: {
                    week: parseInt(week),
                    [Op.or]: [{ home_team: team }, { away_team: team }]
                }
            });
            res.json(matchup || null);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch matchup" });
        }
    });
}