const { NflRegularSeasonGames, NflTeams } = require("../models");
const db = require("../models");
const { Op } = require("sequelize");
const requireAuth = require("../middleware/Requireauth");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/nfl_regular_season_matchups (Supports both week-only and team lookups)
    // --------------------------------------------------------
    app.get("/api/nfl_regular_season_matchups", requireAuth, async (req, res) => {
        try {
            const { week, team } = req.query;

            // If a specific team is requested, handle single matchup lookup
            if (team && team !== "undefined" && team !== "null") {
                const matchup = await NflRegularSeasonGames.findOne({
                    where: {
                        week: parseInt(week),
                        [Op.or]: [{ home_team: team }, { away_team: team }]
                    }
                });
                return res.json(matchup || null);
            }

            // Otherwise, fetch all games for the requested week (used by Pick'em)
            const targetWeek = parseInt(week) || 1;
            const games = await NflRegularSeasonGames.findAll({
                where: { week: targetWeek },
                order: [["game_date", "ASC"]]
            });
            res.json(games);
        } catch (err) {
            console.error("Error fetching regular season matchups:", err);
            res.status(500).json({ error: "Failed to fetch matchups" });
        }
    });


    // --------------------------------------------------------
    // GET /api/nfl_teams (Fetch all NFL teams and colors)
    // --------------------------------------------------------
    app.get("/api/nfl_teams", requireAuth, async (req, res) => {
        try {
            const teams = await NflTeams.findAll({
                order: [["name", "ASC"]]
            });
            res.json(teams);
        } catch (err) {
            console.error("Error fetching NFL teams:", err);
            res.status(500).json({ error: "Failed to fetch NFL teams" });
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