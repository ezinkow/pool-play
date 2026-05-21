const { NbaPicks, NbaSeries, NbaEntries, NbaTiebreaker } = require("../../models");

module.exports = function (app) {
    // GET /api/nba/standings
    app.get("/api/nba/standings", async (req, res) => {
        try {
            // 1. Fetch everything in parallel for speed
            const [entries, series, tiebreakers, allPicks] = await Promise.all([
                NbaEntries.findAll(),
                NbaSeries.findAll(),
                NbaTiebreaker.findAll(),
                NbaPicks.findAll()
            ]);

            // 2. Map data for O(1) lookup
            const seriesMap = {};
            series.forEach(s => seriesMap[s.id] = s);

            const tbMap = {};
            tiebreakers.forEach(t => tbMap[t.user_id] = t.total_points);

            const picksByUser = {};
            allPicks.forEach(p => {
                if (!picksByUser[p.user_id]) picksByUser[p.user_id] = [];
                picksByUser[p.user_id].push(p);
            });

            // 3. Define the absolute ceiling (32*2 + 24*2 + 16*2 + 8*2)
            const TOTAL_TOURNAMENT_MAX = 160;

            const standings = entries.map(entry => {
                const picks = picksByUser[entry.user_id] || [];
                let points = 0;
                let correct_series = 0;
                let correct_lengths = 0;
                let potential_lost = 0;

                for (const pick of picks) {
                    const s = seriesMap[pick.series_id];
                    if (!s) continue;

                    const base = pick.confidence;
                    const maxForThisSeries = base * 2;
                    const homeWins = s.home_wins || 0;
                    const awayWins = s.away_wins || 0;
                    const totalPlayed = homeWins + awayWins;

                    if (s.winner) {
                        // --- SERIES IS OVER ---
                        if (pick.pick === s.winner) {
                            const isPerfect = pick.series_length_guess === s.series_length;
                            const earned = isPerfect ? maxForThisSeries : base;

                            points += earned;
                            correct_series += 1;
                            if (isPerfect) correct_lengths += 1;

                            // If they missed the length, they lost the "bonus" half
                            if (!isPerfect) {
                                potential_lost += (maxForThisSeries - base);
                            }
                        } else {
                            // Picked wrong winner - lost the whole pot
                            potential_lost += maxForThisSeries;
                        }
                    } else {
                        // --- SERIES IN PROGRESS ---
                        const hWins = Number(s.home_wins || 0);
                        const aWins = Number(s.away_wins || 0);
                        const totalPlayed = hWins + aWins;
                        const userLengthGuess = Number(pick.series_length_guess || 4);

                        const pickedTeam = String(pick.pick || "").trim().toLowerCase();
                        const homeTeamName = String(s.home_team || "").trim().toLowerCase();
                        const awayTeamName = String(s.away_team || "").trim().toLowerCase();

                        // 1. ELIMINATION CHECK: Is the picked team already out?
                        const pickedTeamLost = (pickedTeam === homeTeamName && awayWins === 4) ||
                            (pickedTeam === awayTeamName && hWins === 4);

                        // 2. BONUS CHECK: Can the PICKED team still win within the GUESSED length?
                        const currentWinsForPickedTeam = (pickedTeam === homeTeamName) ? hWins : aWins;
                        const winsNeeded = 4 - currentWinsForPickedTeam;

                        // The absolute earliest the series can end with the USER's team winning
                        const earliestPossibleWinForUser = totalPlayed + winsNeeded;

                        const lengthImpossible = earliestPossibleWinForUser > userLengthGuess;

                        if (pickedTeamLost) {
                            potential_lost += maxForThisSeries;
                        } else if (lengthImpossible) {
                            // The user's team can still win the series, but NOT in the length they guessed.
                            // Dock the bonus.
                            potential_lost += (maxForThisSeries - base);
                        }

                        if (pickedTeamLost) {
                            potential_lost += maxForThisSeries;
                        } else if (lengthImpossible) {
                            // Team is still alive, but they can't hit that length anymore.
                            potential_lost += (maxForThisSeries - base);
                        }
                    }
                }

                return {
                    entry_name: entry.entry_name,
                    user_id: entry.user_id,
                    points,
                    correct_series,
                    correct_lengths,
                    max_possible: TOTAL_TOURNAMENT_MAX - potential_lost,
                    tiebreaker: tbMap[entry.user_id] ?? null,
                };
            });

            // 4. Sort: Points -> Correct Series -> Alphabetical
            standings.sort((a, b) =>
                b.points - a.points ||
                b.max_possible - a.max_possible ||
                b.correct_series - a.correct_series
            );

            // 5. Assign Ranks
            let rank = 1;
            for (let i = 0; i < standings.length; i++) {
                if (i > 0 && standings[i].points < standings[i - 1].points) rank = i + 1;
                standings[i].rank = rank;
            }

            res.json(standings);
        } catch (err) {
            console.error("[Standings API Error]:", err);
            res.status(500).json({ error: "Failed to calculate standings" });
        }
    });
};