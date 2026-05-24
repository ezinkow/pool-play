// Requiring our models
const { ChampWeekPickemPicks, ChampWeekPickemGames, ChampWeekPickemTiebreaker } = require("../../models");

module.exports = function (app) {

    // Get everything in ChampWeekPickemPicks table
    app.get("/api/champweek/picks", async (req, res) => {
        try {
            const where = req.query.name ? { name: req.query.name } : {};
            const picks = await ChampWeekPickemPicks.findAll({ where });
            res.json(picks);
        } catch (err) {
            res.status(500).json({ error: "Failed to load picks" });
        }
    });

    // Create OR Overwrite pick
    app.post("/api/champweek/picks", async function (req, res) {
        try {
            const { name, game_id, pick, game_date } = req.body;

            // Check if pick already exists for this user + game
            const existingPick = await ChampWeekPickemPicks.findOne({
                where: {
                    name,
                    game_id
                }
            });

            if (existingPick) {
                // Overwrite existing pick
                await existingPick.update({
                    pick,
                    game_date,
                });

                return res.json({
                    message: "Pick updated",
                    pick: existingPick
                });
            }

            // Otherwise create new pick
            const newPick = await ChampWeekPickemPicks.create({
                name,
                game_id,
                pick,
                game_date
            });

            res.json({
                message: "Pick created",
                pick: newPick
            });

        } catch (err) {
            console.error("Pick submission error:", err);
            res.status(500).json({ error: "Submission failed" });
        }
    });

    app.post("/api/champweek/picks/bulk", async (req, res) => {
        const { name, picks } = req.body;

        if (!name || !picks || !Array.isArray(picks)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        try {
            const picksData = picks.map(p => ({
                name: name,
                game_id: p.game_id,
                pick: p.pick,
                game_date: p.game_date
            }));

            /**
             * bulkCreate with updateOnDuplicate:
             * 1. It attempts to insert all rows.
             * 2. If a (name + game_id) conflict occurs, it updates the specified columns instead.
             * 3. This is ONE single query to the DB (extremely quota-friendly).
             */
            await ChampWeekPickemPicks.bulkCreate(picksData, {
                updateOnDuplicate: ["pick", "game_date"]
            });

            res.json({
                success: true,
                message: `Successfully processed ${picks.length} picks.`
            });
        } catch (err) {
            console.error("Bulk Pick Error:", err);
            res.status(500).json({ error: "Bulk submission failed" });
        }
    });

    //my picks
    app.get("/api/champweek/mypicks", async (req, res) => {
        try {
            const picks = await ChampWeekPickemPicks.findAll({
                where: { name: req.query.name },
                include: [
                    {
                        model: ChampWeekPickemGames,
                        attributes: [
                            "id",
                            "home_team",
                            "away_team",
                            "home_logo",
                            "away_logo",
                            "favorite",
                            "underdog",
                            "line",
                            "game_clock",
                            "winner",
                            "status",
                            "home_score",
                            "away_score"
                        ],
                    },
                ],
                order: [["game_date", "ASC"]],
            });

            // flatten response
            const result = picks.map(p => ({
                ...p.dataValues,
                ...p.Game?.dataValues,
            }));

            res.json(result);
        } catch (err) {
            console.error("mypicks error", err);
            res.status(500).json({ error: "failed" });
        }
    });
};