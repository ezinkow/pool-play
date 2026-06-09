const db = require("../../models");

module.exports = function (app) {
    app.get("/api/worldcup/standings", async (req, res) => {
        try {
            const EntryModel = db.WorldCupEntries || db.world_cup_entries;
            const PicksModel = db.WorldCupPicks || db.world_cup_picks;
            const MatchesModel = db.WorldCupMatches || db.world_cup_matches;

            // 1. Fetch from Entries instead of base users table
            const entriesWithPicks = await EntryModel.findAll({
                attributes: ["user_id", "entry_name"],
                include: [{
                    model: PicksModel,
                    as: "WorldCupPicks",
                    include: [{
                        model: MatchesModel,
                        as: "match"
                    }]
                }]
            });

            // 2. Score entries
            const standings = entriesWithPicks.map(entry => {
                let totalPoints = 0;

                if (entry.WorldCupPicks && Array.isArray(entry.WorldCupPicks)) {
                    entry.WorldCupPicks.forEach(pick => {
                        const match = pick.match;

                        if (match && match.status === "STATUS_FINAL") {
                            const isCorrect = pick.selection === match.result;

                            if (isCorrect) {
                                if (match.result === "Draw" && parseInt(match.round) === 0) {
                                    totalPoints += match.draw_points_value || 2;
                                } else {
                                    totalPoints += match.points_value || 1;
                                }
                            }
                        }
                    });
                }

                return {
                    id: entry.user_id,
                    name: entry.entry_name, // Maps custom display name down safely to the matrix
                    points: totalPoints
                };
            });

            standings.sort((a, b) => b.points - a.points);
            res.json(standings);

        } catch (err) {
            console.error("❌ Standings Compilation Error:", err);
            res.status(500).json({ error: "Failed to compile live standings calculations" });
        }
    });
};