const db = require("../../models");

module.exports = function (app) {
    app.get("/api/worldcup/standings", async (req, res) => {
        try {
            const EntryModel = db.WorldCupEntries || db.world_cup_entries;
            const PicksModel = db.WorldCupPicks || db.world_cup_picks;
            const MatchesModel = db.WorldCupMatches || db.world_cup_matches;

            // 1. Fetch Entries and Picks separately
            const entries = await EntryModel.findAll({ attributes: ["user_id", "entry_name"] });
            const allPicks = await PicksModel.findAll({ include: [{ model: MatchesModel, as: "match" }] });

            const standingsMap = new Map();

            // 2. Pre-map picks by user_id for instant lookup
            const picksByUser = allPicks.reduce((acc, pick) => {
                if (!acc[pick.user_id]) acc[pick.user_id] = [];
                acc[pick.user_id].push(pick);
                return acc;
            }, {});

            // 3. Build standings
            entries.forEach(entry => {
                const uid = entry.user_id;
                standingsMap.set(uid, { id: uid, name: entry.entry_name, group_points: 0, bracket_points: 0, points: 0 });
                const stats = standingsMap.get(uid);

                const userPicks = picksByUser[uid] || [];
                userPicks.forEach(pick => {
                    const match = pick.match;
                    if (match && ["STATUS_FULL_TIME", "STATUS_FINAL", "FINAL"].includes(match.status)) {
                        if (pick.selection?.trim().toLowerCase() === match.result?.trim().toLowerCase()) {
                            const pts = (match.result?.toLowerCase() === "draw" && parseInt(match.round) === 0)
                                ? (match.draw_points_value || 2) : (match.points_value || 1);

                            if (parseInt(match.round) === 0) stats.group_points += pts;
                            else stats.bracket_points += pts;
                            stats.points += pts;
                        }
                    }
                });
            });

            res.json(Array.from(standingsMap.values()).sort((a, b) => b.points - a.points));
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed" });
        }
    });
};