const { ChampWeekPickemTiebreaker } = require("../../models");

module.exports = function (app) {
    app.get("/api/champweek/tiebreaker", async (req, res) => {
        try {
            const { name } = req.query;
            const record = await ChampWeekPickemTiebreaker.findOne({ where: { name } });
            res.json(record || null);
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });

    app.post("/api/champweek/tiebreaker", async (req, res) => {
        try {
            const { name, win_score, loss_score } = req.body;
            await ChampWeekPickemTiebreaker.upsert({ name, win_score, loss_score });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });
}