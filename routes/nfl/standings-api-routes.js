const { NflStandings } = require("../../models");

module.exports = function (app) {

    // Get everything in NflStandings table
    app.get("/api/nfl_playoffs/standings", function (req, res) {
        NflStandings.findAll({})
            .then(function (dbstandings) {
                res.json(dbstandings)
            })
    });
}