const { TourneyPickemPicks, TourneyPickemGames, TourneyPickemUsers } = require("../../models");

module.exports = function (app) {

    app.get("/api/tourneypickem/standings", async (req, res) => {
        try {
            const users = await TourneyPickemUsers.findAll({ attributes: ["id", "name"] });
            const games = await TourneyPickemGames.findAll();
            const gameMap = {};
            for (const g of games) gameMap[g.id] = g;

            const standings = [];

            for (const user of users) {
                const picks = await TourneyPickemPicks.findAll({
                    where: { user_id: user.id }
                });

                let points = 0;
                let correct = 0;
                let missed = 0;

                for (const pick of picks) {
                    const game = gameMap[pick.game_id];
                    if (!game || !game.winner) continue;

                    const roundPoints = game.round_points || 1;

                    if (pick.missed_pick_flag) {
                        if (pick.pick === game.winner) {
                            points += roundPoints * 0.5;
                            missed += 1;  // only count as "correct missed" if the underdog actually won
                        }
                        // if wrong, no points, don't increment missed
                    } else if (pick.pick === game.winner) {
                        points += roundPoints;
                        correct += 1;
                    }
                }

                standings.push({
                    name: user.name,
                    points,
                    correct,
                    missed,
                });
            }

            standings.sort((a, b) => b.points - a.points || b.correct - a.correct);
            res.json(standings);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load standings" });
        }
    });
};