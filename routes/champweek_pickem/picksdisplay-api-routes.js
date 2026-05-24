// Requiring our models
const { ChampWeekPickemPicks, ChampWeekPickemGames } = require("../../models");


module.exports = function (app) {

      // Find picks_display where set to visible
    app.get('/api/champweek/games/finishedAndInProgress', function (req, res) {
        ChampWeekPickemGames.findAll({
            where: {
                status: ['STATUS_FINAL', 'STATUS_IN_PROGRESS', 'STATUS_HALFTIME']
            }
        })
            .then(function (dbgames) {
                res.json(dbgames)
            })
    })


}