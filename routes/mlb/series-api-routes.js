// 1. Point to the root models folder where the 'Flat' index lives
const db = require("../../models");

module.exports = function (app) {
    // 2. Destructure MlbSeries from db inside each route for safety

    // GET /api/mlb/series — all series ordered by round then slot
    app.get("/api/mlb/series", async (req, res) => {
        const { MlbSeries } = db;
        try {
            const series = await MlbSeries.findAll({
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series" });
        }
    });

    // GET /api/mlb/series/active — unlocked series only (open for picks)
    app.get("/api/mlb/series/active", async (req, res) => {
        const { MlbSeries } = db;
        try {
            const series = await MlbSeries.findAll({
                where: { locked: false },
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load active series" });
        }
    });

    // GET /api/mlb/series/round/:round — all series for a specific round
    app.get("/api/mlb/series/round/:round", async (req, res) => {
        const { MlbSeries } = db;
        try {
            const series = await MlbSeries.findAll({
                where: { round: req.params.round },
                order: [["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series for round" });
        }
    });

    // GET /api/mlb/series/live — in-progress and final series (for results display)
    app.get("/api/mlb/series/live", async (req, res) => {
        const { MlbSeries } = db;
        try {
            const series = await MlbSeries.findAll({
                where: {
                    status: ["STATUS_IN_PROGRESS", "STATUS_FINAL"],
                },
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load live series" });
        }
    });
};