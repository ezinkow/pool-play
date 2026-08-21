const axios = require("axios");
const db = require("../../models");

async function syncHrdData() {
    try {
        console.log("Synchronizing Home Run Derby player stats & monthly buckets...");

        async function fetchAllEspnBatters(seasonYear) {
            let allAthletes = [];
            let page = 1;
            let hasMore = true;

            while (hasMore && page <= 5) {
                const url = `https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/statistics/byathlete?category=batting&sort=batting.homeRuns:desc&season=${seasonYear}&seasontype=2&limit=250&page=${page}`;
                const response = await axios.get(url);
                const athletes = response.data.athletes || [];

                if (athletes.length === 0) {
                    hasMore = false;
                } else {
                    allAthletes = allAthletes.concat(athletes);
                    if (athletes.length < 250) hasMore = false;
                    else page++;
                }
            }
            return allAthletes;
        }

        // 1. Fetch 2025 Stats (for salaries & eligibility)
        const athletes2025 = await fetchAllEspnBatters(2025);
        const stats2025Map = {};
        athletes2025.forEach(item => {
            const athleteId = item.athlete.id;
            const battingCat = item.categories?.find(c => c.name === "batting");
            if (battingCat) {
                stats2025Map[athleteId] = {
                    atBats: parseInt(battingCat.totals[1]) || 0,
                    homeRuns: parseInt(battingCat.totals[7]) || 0
                };
            }
        });

        // 2. Fetch 2026 Live Stats
        const athletes2026 = await fetchAllEspnBatters(2026);

        // Determine current active month column based on today's date
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // 1-12 (Jan = 1, April = 4, etc.)
        
        const monthColumnMap = {
            3: "hr_april",   // March games roll into April per rules
            4: "hr_april",
            5: "hr_may",
            6: "hr_june",
            7: "hr_july",
            8: "hr_august",
            9: "hr_september",
            10: "hr_september" // October games roll into September per rules
        };
        const activeMonthCol = monthColumnMap[currentMonth] || "hr_april";

        for (const item of athletes2026) {
            const ath = item.athlete;
            const athleteId = ath.id;
            const stats2025 = stats2025Map[athleteId] || { atBats: 0, homeRuns: 0 };

            const battingCat = item.categories?.find(c => c.name === "batting");
            const newHr2026Total = battingCat ? (parseInt(battingCat.totals[7]) || 0) : 0;
            const isEligible = stats2025.homeRuns >= 12 && stats2025.atBats >= 400;

            // Fetch existing player record to calculate the delta (new home runs hit since last sync)
            const existingPlayer = await db.HrdPlayers.findByPk(athleteId);
            
            let updateData = {
                id: athleteId,
                name: ath.displayName,
                short_name: ath.shortName,
                team: ath.teamName || "FA",
                headshot: ath.headshot?.href || null,
                position: ath.position?.abbreviation || "DH",
                salary: stats2025.homeRuns,
                hr_2025: stats2025.homeRuns,
                at_bats_2025: stats2025.atBats,
                hr_2026: newHr2026Total,
                eligible: isEligible
            };

            if (existingPlayer) {
                const hrDifference = newHr2026Total - existingPlayer.hr_2026;
                if (hrDifference > 0) {
                    // Add newly detected home runs directly to the active month's column
                    updateData[activeMonthCol] = existingPlayer[activeMonthCol] + hrDifference;
                }
            } else if (newHr2026Total > 0) {
                // If brand new record during active month
                updateData[activeMonthCol] = newHr2026Total;
            }

            await db.HrdPlayers.upsert(updateData);
        }

        console.log(`HRD player stats & ${activeMonthCol} monthly buckets synced successfully!`);
    } catch (err) {
        console.error("Error syncing HRD stats with monthly tracking:", err);
    }
}

module.exports = syncHrdData;