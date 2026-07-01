const db = require("../../models");

module.exports = function (app) {
    app.get("/api/worldcup/standings", async (req, res) => {
        try {
            const EntryModel = db.WorldCupEntries || db.world_cup_entries;
            const PicksModel = db.WorldCupPicks || db.world_cup_picks;
            const MatchesModel = db.WorldCupMatches || db.world_cup_matches;
            const CountryModel = db.WorldCupCountryInfo;

            const entries = await EntryModel.findAll({ attributes: ["user_id", "entry_name"] });
            const allPicks = await PicksModel.findAll({ include: [{ model: MatchesModel, as: "match" }] });

            // Fetch all countries once to map names to flags efficiently
            const countries = await CountryModel.findAll();
            const countryMap = new Map(countries.map(c => [c.name.trim().toLowerCase(), c.flag_url]));

            const picksByUser = allPicks.reduce((acc, pick) => {
                if (!acc[pick.user_id]) acc[pick.user_id] = [];
                acc[pick.user_id].push(pick);
                return acc;
            }, {});

            const standingsMap = new Map();
            const CHAMP_MATCH_ID = "760517";

            entries.forEach(entry => {
                const uid = entry.user_id;
                standingsMap.set(uid, {
                    id: uid,
                    name: entry.entry_name,
                    group_points: 0,
                    bracket_points: 0,
                    points: 0,
                    champion_pick: "TBD",
                    champion_logo: null
                });

                const stats = standingsMap.get(uid);
                const userPicks = picksByUser[uid] || [];
                const matchedMatchIds = new Set();

                userPicks.forEach(pick => {
                    const match = pick.match;
                    if (!match) return;

                    // 1. Identify Champion Pick using the new CountryModel
                    if (String(pick.match_id) === CHAMP_MATCH_ID) {
                        stats.champion_pick = pick.selection;
                        // Look up the flag from our new table
                        stats.champion_logo = countryMap.get(pick.selection?.trim().toLowerCase()) || null;
                    }

                    // 2. Points Logic
                    // Replace your existing Points Logic block with this:
                    if (["STATUS_FULL_TIME", "STATUS_FINAL", "FINAL", "STATUS_FINAL_PEN"].includes(match.status)) {
                        if (matchedMatchIds.has(match.match_id)) return;

                        let isCorrect = false;
                        let pts = 0;

                        if (parseInt(match.round) === 0) {
                            // GROUP STAGE: Selection is "Home", "Away", or "Draw"
                            isCorrect = pick.selection?.trim().toLowerCase() === match.result?.trim().toLowerCase();
                            pts = (match.result?.toLowerCase() === "draw") ? (match.draw_points_value || 2) : (match.points_value || 1);
                        } else {
                            // KNOCKOUT: Selection is "Spain", "Brazil", etc.
                            // We resolve the actual winner name from the database match record
                            const winnerName = (match.result?.trim().toLowerCase() === "home")
                                ? match.home_team?.trim().toLowerCase()
                                : match.away_team?.trim().toLowerCase();

                            isCorrect = pick.selection?.trim().toLowerCase() === winnerName;
                            pts = match.points_value || 2; // Bracket point value
                        }

                        if (isCorrect) {
                            matchedMatchIds.add(match.match_id);
                            if (parseInt(match.round) === 0) stats.group_points += pts;
                            else stats.bracket_points += pts;
                            stats.points += pts;
                        }
                    }
                });
            });

            res.json(Array.from(standingsMap.values()).sort((a, b) => b.points - a.points));
        } catch (err) {
            console.error("❌ Standings Error:", err);
            res.status(500).json({ error: "Failed to calculate standings" });
        }
    });
};