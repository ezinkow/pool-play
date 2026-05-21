const { PicksBracket, GamesBracket, UsersBracket } = require("../../models");

module.exports = function (app) {

    app.get("/api/bracket/standings", async (req, res) => {
        try {
            const users = await UsersBracket.findAll({ attributes: ["id", "name"] });
            const games = await GamesBracket.findAll();
            const gameMap = {};
            for (const g of games) gameMap[g.id] = g;

            const champGame = games.find(g => g.round === 6);
            const standings = [];

            for (const user of users) {
                const picks = await PicksBracket.findAll({
                    where: { user_id: user.id }
                });

                let points = 0;
                let correct = 0;
                let predictedWinner = null;

                for (const pick of picks) {
                    const game = gameMap[pick.game_id];
                    if (!game) continue;

                    if (champGame && pick.game_id === champGame.id) {
                        predictedWinner = pick.pick;
                    }

                    if (game.status === "STATUS_FINAL" && game.winner && pick.pick === game.winner) {
                        // Base round points
                        const roundPoints = game.round_points || game.round || 1;

                        // Seed bonus — find the winning team's seed
                        const winningSeed = game.winner === game.home_team
                            ? game.home_seed
                            : game.away_seed;

                        const seedBonus = winningSeed || 0;

                        points += roundPoints + seedBonus;
                        correct += 1;
                    }
                }

                standings.push({
                    name: user.name,
                    points,
                    correct,
                    predictedWinner,
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