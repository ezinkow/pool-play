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
    
    // GET /api/settings/pool-started?game_key=...
    app.get("/api/settings/pool-started", async (req, res) => {
        try {
            const { game_key } = req.query;
            // Check if Week 1 (or the earliest scheduled game for this context) has started
            const firstGame = await NflRegularSeasonGames.findOne({
                where: { week: 1 },
                order: [["game_date", "ASC"]]
            });

            const started = firstGame && firstGame.game_date ? new Date() >= new Date(firstGame.game_date) : false;
            res.json({ started });
        } catch (err) {
            console.error("Error checking if pool started:", err);
            res.json({ started: false });
        }
    });
}