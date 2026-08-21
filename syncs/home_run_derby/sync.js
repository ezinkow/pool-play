const axios = require("axios");
const db = require("../../models");

async function syncHrdData() {
    try {
        console.log("Synchronizing Home Run Derby player pool (Eligible hitters only)...");

        // 1. Fetch ALL 2025 Regular Season Hitters from MLB Stats API
        const url2025 = `https://bdfed.stitch.mlbinfra.com/bdfed/stats/player?env=prod&season=2025&sportId=1&stats=season&group=hitting&gameType=R&limit=1000&offset=0&sortStat=homeRuns&order=desc`;
        const response2025 = await axios.get(url2025);
        const hitters2025 = response2025.data.stats || [];

        const eligiblePlayersMap = {};

        hitters2025.forEach(player => {
            const atBats = parseInt(player.atBats) || 0;
            const homeRuns = parseInt(player.homeRuns) || 0;

            // STRICT ELIGIBILITY RULE: 12+ HRs AND 350+ ABs in 2025
            if (homeRuns >= 12 && atBats >= 350) {
                const athleteId = String(player.playerId);
                eligiblePlayersMap[athleteId] = {
                    id: athleteId,
                    name: player.playerName || `${player.playerFirstName} ${player.playerLastName}`,
                    short_name: player.useName ? `${player.useName[0]}. ${player.playerLastName}` : player.playerName,
                    team: player.teamAbbrev || "FA",
                    headshot: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/w_480,q_auto:best/v1/people/${athleteId}/headshot/silo/current`,
                    position: player.position || "DH",
                    salary: homeRuns, // 2025 HRs = Salary
                    hr_2025: homeRuns,
                    at_bats_2025: atBats
                };
            }
        });

        console.log(`Found ${Object.keys(eligiblePlayersMap).length} eligible hitters.`);

        // 2. Fetch Live 2026 Season Hitters from MLB Stats API
        const url2026 = `https://bdfed.stitch.mlbinfra.com/bdfed/stats/player?env=prod&season=2026&sportId=1&stats=season&group=hitting&gameType=R&limit=1000&offset=0&sortStat=homeRuns&order=desc`;
        
        let stats2026Map = {};
        try {
            const response2026 = await axios.get(url2026);
            const hitters2026 = response2026.data.stats || [];
            hitters2026.forEach(p => {
                stats2026Map[String(p.playerId)] = parseInt(p.homeRuns) || 0;
            });
        } catch (err) {
            console.warn("2026 MLB season stats not active yet or unreachable, defaulting live HRs to 0.");
        }

        // 3. Determine active month column based on today's date
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const monthColumnMap = {
            3: "hr_april", 4: "hr_april", 5: "hr_may", 
            6: "hr_june", 7: "hr_july", 8: "hr_august", 
            9: "hr_september", 10: "hr_september"
        };
        const activeMonthCol = monthColumnMap[currentMonth] || "hr_april";

        // 4. Only upsert the strictly eligible players into the database
        for (const athleteId in eligiblePlayersMap) {
            const playerData = eligiblePlayersMap[athleteId];
            const live2026HR = stats2026Map[athleteId] || 0;

            const existingPlayer = await db.HrdPlayers.findByPk(athleteId);

            let updateData = {
                ...playerData,
                hr_2026: live2026HR
            };

            if (existingPlayer) {
                const hrDifference = live2026HR - existingPlayer.hr_2026;
                if (hrDifference > 0) {
                    updateData[activeMonthCol] = (existingPlayer[activeMonthCol] || 0) + hrDifference;
                } else {
                    updateData[activeMonthCol] = existingPlayer[activeMonthCol] || 0;
                }
            } else {
                updateData[activeMonthCol] = live2026HR;
            }

            await db.HrdPlayers.upsert(updateData);
        }

        console.log("HRD Eligible Sync Complete! Table now contains only qualifying sluggers.");
    } catch (err) {
        console.error("Error syncing eligible HRD stats:", err);
    }
}

module.exports = syncHrdData;