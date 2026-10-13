const { NcaaTeams, NflTeams, NbaTeams } = require("../models");
const requireAuth = require("../middleware/Requireauth");

module.exports = function (app) {


    // --------------------------------------------------------
    // GET /api/nfl_teams (Fetch all NFL teams and colors)
    // --------------------------------------------------------
    app.get("/api/nfl_teams", requireAuth, async (req, res) => {
        try {
            const teams = await NflTeams.findAll({
                order: [["name", "ASC"]]
            });
            res.json(teams);
        } catch (err) {
            console.error("Error fetching NFL teams:", err);
            res.status(500).json({ error: "Failed to fetch NFL teams" });
        }
    });

    // --------------------------------------------------------
    // GET /api/ncaa_teams (Fetch all NCAA teams and colors)
    // --------------------------------------------------------
    app.get("/api/ncaa_teams", requireAuth, async (req, res) => {
        try {
            const teams = await NcaaTeams.findAll({
                order: [["name", "ASC"]]
            });
            res.json(teams);
        } catch (err) {
            console.error("Error fetching CFB teams:", err);
            res.status(500).json({ error: "Failed to fetch CFB teams" });
        }
    });

        // --------------------------------------------------------
    // GET /api/nba_teams (Fetch all NBA teams and colors)
    // --------------------------------------------------------
    app.get("/api/nba_teams", requireAuth, async (req, res) => {
        try {
            const teams = await NbaTeams.findAll({
                order: [["name", "ASC"]]
            });
            res.json(teams);
        } catch (err) {
            console.error("Error fetching NBA teams:", err);
            res.status(500).json({ error: "Failed to fetch NBA teams" });
        }
    });

}