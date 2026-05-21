const { NbaSeries } = require("../../models");

module.exports = function (app) {

  app.get("/api/nba/games/history", async (req, res) => {
    try {
      const games = await NbaSeries.findAll({
        order: [["game_date", "DESC"]]
      });
      res.json(games.map(g => ({
        id: g.id,
        game_date: g.game_date,
        home_team: g.home_team,
        home_score: g.home_score,
        home_logo: g.home_logo,
        away_team: g.away_team,
        away_logo: g.away_logo,
        away_score: g.away_score,
        favorite: g.favorite,
        fav_logo: g.fav_logo,
        underdog: g.underdog,
        dog_logo: g.dog_logo,
        line: g.line,
        winner: g.winner,
        status: g.status,
        game_clock: g.game_clock,
      })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch scoreboard" });
    }
  });
};