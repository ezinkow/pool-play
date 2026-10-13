const { NbaRegularSeasonGames } = require("../models");
const db = require("../models");
const { Op } = require("sequelize");
const requireAuth = require("../middleware/Requireauth");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/nba_regular_season_games (Supports both week-only and team lookups)
    // --------------------------------------------------------
    app.get("/api/nba_regular_season_games", requireAuth, async (req, res) => {
        try {
            const { week, team } = req.query;

            // If a specific team is requested, handle single matchup lookup
            if (team && team !== "undefined" && team !== "null") {
                const matchup = await NbaRegularSeasonGames.findOne({
                    where: {
                        week: parseInt(week),
                        [Op.or]: [{ home_team: team }, { away_team: team }]
                    }
                });
                return res.json(matchup || null);
            }

            // Otherwise, fetch all games for the requested week (used by Pick'em)
            const targetWeek = parseInt(week) || 1;
            const games = await NbaRegularSeasonGames.findAll({
                where: { week: targetWeek },
                order: [["game_date", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error("Error fetching regular season matchups:", err);
            res.status(500).json({ error: "Failed to fetch matchups" });
        }
    });

}