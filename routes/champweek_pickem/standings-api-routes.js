// routes/standings.js
const { ChampWeekPickemUsers, ChampWeekPickemPicks, ChampWeekPickemGames } = require("../../models");

module.exports = function (app) {
    app.get("/api/champweek/standings", async (req, res) => {
        try {
            const users = await ChampWeekPickemUsers.findAll({
                include: [
                    {
                        model: ChampWeekPickemPicks,
                        required: false,
                        include: [
                            {
                                model: ChampWeekPickemGames,
                                required: false,
                                where: { status: "STATUS_FINAL" },
                            },
                        ],
                    },
                ],
            });

            const standings = users.map((user) => {
                let points = 0;
                let correct = 0;
                let missed = 0;

                if (!user.ChampWeekPickemPicks) return {
                    user_id: user.id,
                    name: user.name,
                    points: 0,
                    correct: 0,
                    missed: 0,
                    total_correct: 0,
                };

                user.ChampWeekPickemPicks.forEach((pick) => {
                    const game = pick.Game;
                    if (!game) return;
                    if (!game.winner) return;

                    const isCorrect = pick.pick === game.winner;

                    if (!isCorrect) return;

                    if (pick.missed_pick_flag == true) {
                        points += 0.5;
                        missed += 1;
                    } else {
                        points += 1;
                        correct += 1;
                    }
                });

                return {
                    user_id: user.id,
                    name: user.name,
                    points,
                    correct,
                    missed,
                    total_correct: correct + missed,
                };
            });

            standings.sort((a, b) => b.points - a.points);

            res.json(standings);
        } catch (err) {
            console.error("Standings error:", err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });
};