const { NflRegularSeasonGames, NflTeams } = require("../models");
const db = require("../models");
const { Op } = require("sequelize");
const requireAuth = require("../middleware/Requireauth");

const weeks = [
    { week: 1, start: new Date("2026-09-09T00:00:00"), end: new Date("2026-09-15T23:59:59") },
    { week: 2, start: new Date("2026-09-16T00:00:00"), end: new Date("2026-09-22T23:59:59") },
    { week: 3, start: new Date("2026-09-23T00:00:00"), end: new Date("2026-09-29T23:59:59") },
    { week: 4, start: new Date("2026-09-30T00:00:00"), end: new Date("2026-10-05T23:59:59") },
    { week: 5, start: new Date("2026-10-06T00:00:00"), end: new Date("2026-10-12T23:59:59") },
    { week: 6, start: new Date("2026-10-13T00:00:00"), end: new Date("2026-10-19T23:59:59") },
    { week: 7, start: new Date("2026-10-20T00:00:00"), end: new Date("2026-10-26T23:59:59") },
    { week: 8, start: new Date("2026-10-27T00:00:00"), end: new Date("2026-11-02T23:59:59") },
    { week: 9, start: new Date("2026-11-03T00:00:00"), end: new Date("2026-11-09T23:59:59") },
    { week: 10, start: new Date("2026-11-10T00:00:00"), end: new Date("2026-11-16T23:59:59") },
    { week: 11, start: new Date("2026-11-17T00:00:00"), end: new Date("2026-11-23T23:59:59") },
    { week: 12, start: new Date("2026-11-25T00:00:00"), end: new Date("2026-12-01T23:59:59") },
    { week: 13, start: new Date("2026-12-02T00:00:00"), end: new Date("2026-12-08T23:59:59") },
    { week: 14, start: new Date("2026-12-09T00:00:00"), end: new Date("2026-12-15T23:59:59") },
    { week: 15, start: new Date("2026-12-16T00:00:00"), end: new Date("2026-12-22T23:59:59") },
    { week: 16, start: new Date("2026-12-23T00:00:00"), end: new Date("2026-12-29T23:59:59") },
    { week: 17, start: new Date("2026-12-30T00:00:00"), end: new Date("2027-01-05T23:59:59") },
    { week: 18, start: new Date("2027-01-06T00:00:00"), end: new Date("2027-01-12T23:59:59") }
];

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/nfl_regular_season_games (Supports both week-only and team lookups)
    // --------------------------------------------------------
    app.get("/api/nfl_regular_season_games", async (req, res) => {
        try {
            const { week, team } = req.query;

            if (team && team !== "undefined" && team !== "null") {
                const matchup = await NflRegularSeasonGames.findOne({
                    where: {
                        week: parseInt(week),
                        [Op.or]: [{ home_team: team }, { away_team: team }]
                    }
                });
                return res.json(matchup || null);
            }

            // If no week is passed, fallback to the current active week dynamically
            let targetWeek = parseInt(week);
            if (!targetWeek || isNaN(targetWeek)) {
                const now = new Date();

                let activeIndex = 0;
                for (let i = weeks.length - 1; i >= 0; i--) {
                    if (now >= weeks[i].start) { activeIndex = i; break; }
                }
                targetWeek = weeks[activeIndex].week;
            }

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
    // GET /api/nfl_regular_season/settings (Fetch active week dynamically)
    // --------------------------------------------------------
    app.get("/api/nfl_regular_season/settings", requireAuth, async (req, res) => {
        try {
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            const setting = SettingsModel ? await SettingsModel.findOne({ where: { season: "nfl_regular_season" } }) : null;

            // Dynamic week calculator fallback
            const now = new Date();

            let activeIndex = 0;
            for (let i = weeks.length - 1; i >= 0; i--) {
                if (now >= weeks[i].start) {
                    activeIndex = i;
                    break;
                }
            }
            const dynamicWeek = weeks[activeIndex].week;

            return res.json({
                current_week: setting?.current_week || dynamicWeek,
                is_active: setting ? setting.is_active : true,
                title: setting?.title || "NFL Regular Season"
            });
        } catch (err) {
            console.error("Failed to fetch regular_season settings:", err);
            return res.status(500).json({ error: "Failed to load regular_season settings" });
        }
    });

}