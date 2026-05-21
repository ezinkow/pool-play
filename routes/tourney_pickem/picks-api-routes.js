const { TourneyPickemPicks, TourneyPickemGames, TourneyPickemEntries, TourneyPickemTiebreaker } = require("../../models");

module.exports = function (app) {

    // Get picks for a user
    app.get("/api/tourneypickem/picks", async (req, res) => {
        try {
            const { name } = req.query;
            const user = await TourneyPickemEntries.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });

            const picks = await TourneyPickemPicks.findAll({
                where: { user_id: user.id },
                include: [{
                    model: TourneyPickemGames,
                    attributes: [
                        "id", "game_date", "home_team", "away_team",
                        "home_logo", "away_logo", "favorite", "underdog",
                        "fav_logo", "dog_logo", "line", "winner",
                        "status", "game_clock", "home_score", "away_score"
                    ]
                }]
            });
            res.json(picks);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load picks" });
        }
    });

    app.get("/api/tourneypickem/mypicks", async (req, res) => {
        try {
            const { name } = req.query;
            const user = await TourneyPickemEntries.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });

            const picks = await TourneyPickemPicks.findAll({
                where: { user_id: user.id },
                include: [{
                    model: TourneyPickemGames,
                    attributes: [
                        "id", "home_team", "away_team", "home_logo", "away_logo",
                        "favorite", "underdog", "line", "game_clock", "winner",
                        "status", "home_score", "away_score"
                    ],
                }],
                order: [["game_date", "DESC"]],
            });

            // Flatten so component can access game fields at top level
            const result = picks.map(p => ({
                ...p.dataValues,
                Game: p.TourneyPickemGames?.dataValues,
                home_logo: p.TourneyPickemGames?.home_logo,
                away_logo: p.TourneyPickemGames?.away_logo,
                home_score: p.TourneyPickemGames?.home_score,
                away_score: p.TourneyPickemGames?.away_score,
                home_team: p.TourneyPickemGames?.home_team,
                away_team: p.TourneyPickemGames?.away_team,
            }));

            res.json(result);
        } catch (err) {
            console.error("mypicks error", err);
            res.status(500).json({ error: "failed" });
        }
    });

    // Bulk upsert picks
    app.post("/api/tourneypickem/picks/bulk", async (req, res) => {
        try {
            const { name, picks } = req.body;
            const user = await TourneyPickemEntries.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });

            for (const p of picks) {
                await TourneyPickemPicks.upsert({
                    user_id: user.id,
                    game_id: p.game_id,
                    pick: p.pick,
                    game_date: p.game_date,
                });
            }
            res.json({ success: true, count: picks.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to save picks" });
        }
    });

    app.get("/api/tourneypickem/tiebreaker", async (req, res) => {
        try {
            const { name } = req.query;
            const user = await TourneyPickemEntries.findOne({ where: { name } });
            if (!user) return res.json(null);
            const record = await TourneyPickemTiebreaker.findOne({ where: { user_id: user.id } });
            res.json(record || null);
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });

    app.post("/api/tourneypickem/tiebreaker", async (req, res) => {
        try {
            const champGame = await TourneyPickemGames.findOne({ where: { id: "401856600" } });
            if (champGame && champGame.status !== "STATUS_SCHEDULED") {
                return res.status(403).json({ error: "Tiebreaker is locked" });
            }
            const { name, win_score, loss_score } = req.body;
            const user = await TourneyPickemEntries.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });
            await TourneyPickemTiebreaker.upsert({ user_id: user.id, win_score, loss_score });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });

    // Get all users' tiebreakers (for group display)
    app.get("/api/tourneypickem/tiebreaker/all", async (req, res) => {
        try {
            const users = await TourneyPickemEntries.findAll({ attributes: ["id", "name"] });
            const tiebreakers = await TourneyPickemTiebreaker.findAll();
            const tbMap = {};
            for (const t of tiebreakers) tbMap[t.user_id] = t;
            const result = users.map(u => ({
                name: u.name,
                win_score: tbMap[u.id]?.win_score ?? null,
                loss_score: tbMap[u.id]?.loss_score ?? null,
            }));
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });
};