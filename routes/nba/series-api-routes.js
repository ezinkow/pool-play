// 1. Point to the root models folder where the 'Flat' index lives
const db = require("../../models");

module.exports = function (app) {
    // 2. Destructure NbaSeries from db inside each route for safety

    // GET /api/nba_playoffs_series — all series ordered by round then slot
    app.get("/api/nba_playoffs_series", async (req, res) => {
        const { NbaSeries } = db;
        try {
            const series = await NbaSeries.findAll({
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series" });
        }
    });

    // GET /api/nba_playoffs_series/active — unlocked series only (open for picks)
    app.get("/api/nba_playoffs_series/active", async (req, res) => {
        const { NbaSeries } = db;
        try {
            const series = await NbaSeries.findAll({
                where: { locked: false },
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load active series" });
        }
    });

    // GET /api/nba_playoffs_series/round/:round — all series for a specific round
    app.get("/api/nba_playoffs_series/round/:round", async (req, res) => {
        const { NbaSeries } = db;
        try {
            const series = await NbaSeries.findAll({
                where: { round: req.params.round },
                order: [["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series for round" });
        }
    });

    // GET /api/nba_playoffs_series/live — in-progress and final series (for results display)
    app.get("/api/nba_playoffs_series/live", async (req, res) => {
        const { NbaSeries } = db;
        try {
            const series = await NbaSeries.findAll({
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