const { PicksBracket, GamesBracket, UsersBracket } = require("../../models");

module.exports = function (app) {

    app.get("/api/bracket/picks/display", async (req, res) => {
        try {
            const { name } = req.query;
            const user = await UsersBracket.findOne({ where: { name } });
            if (!user) return res.status(404).json({ error: "User not found" });

            const picks = await PicksBracket.findAll({
                where: { user_id: user.id },
                include: [{
                    model: GamesBracket,
                    attributes: [
                        "id", "round", "round_label", "round_points",
                        "region", "bracket_slot", "status", "winner",
                        "home_team", "home_seed", "home_logo",
                        "away_team", "away_seed", "away_logo",
                        "home_score", "away_score", "game_clock"
                    ]
                }]
            });
            res.json(picks);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load picks display" });
        }
    });

    app.get("/api/bracket/picks/all", async (req, res) => {
        try {
            const picks = await PicksBracket.findAll({
                include: [{
                    model: UsersBracket,
                    attributes: ["name"]
                }]
            });
            const flat = picks.map(p => ({
                game_id: p.game_id,
                pick: p.pick,
                name: p.UsersBracket.name,
            }));
            res.json(flat);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load all bracket picks" });
        }
    });
};