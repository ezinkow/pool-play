const { TiebreakerBracket, UsersBracket } = require("../../models");

module.exports = function (app) {
    app.get("/api/bracket/tiebreaker", async (req, res) => {
        try {
            const { name } = req.query;
            const user = await UsersBracket.findOne({ where: { name } });
            if (!user) return res.json(null);
            const record = await TiebreakerBracket.findOne({ where: { user_id: user.id } });
            res.json(record || null);
        } catch { res.status(500).json({ error: "Failed" }); }
    });

    app.post("/api/bracket/tiebreaker", async (req, res) => {
        try {
            const { name, win_score, loss_score } = req.body;
            const user = await UsersBracket.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });
            await TiebreakerBracket.upsert({ user_id: user.id, win_score, loss_score });
            res.json({ success: true });
        } catch { res.status(500).json({ error: "Failed" }); }
    });
};