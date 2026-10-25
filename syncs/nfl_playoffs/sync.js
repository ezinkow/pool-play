const axios = require("axios");
const db = require("../../models");

// 🏈 Fantasy Scoring Rules Configuration
const FANTASY_SCORING = {
    passingTD: 4,
    reception: 1,
    yard: 0.1,        // Applies to both rushing and receiving yards
    receivingTD: 6
};

/**
 * Syncs player fantasy scores for all NFL Playoff games by fetching the global
 * postseason scoreboard, looping through all game summaries, and saving player stats.
 */
async function syncPlayoffPlayerFantasyScores() {
    try {
        // seasontype=3 specifies the postseason; omitting the week parameter pulls all playoff games.
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=3`;
        
        console.log(`[Playoff Fantasy Sync] Fetching all NFL playoff games...`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const events = data?.events || [];
        if (events.length === 0) {
            console.log(`[Playoff Fantasy Sync] No playoff games found on the scoreboard.`);
            return;
        }

        // Extract all game IDs across the entire postseason
        const gameIds = events.map(event => event.id);
        console.log(`[Playoff Fantasy Sync] Found ${gameIds.length} total playoff games. Processing summaries...`);

        // Map to aggregate player totals: { playerId: { passingTDs, passingYards, rushingYards, receptions, receivingTDs } }
        const allPlayoffPlayerStats = {};

        for (const gameId of gameIds) {
            try {
                const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`;
                const summaryResponse = await axios.get(summaryUrl, { timeout: 10000 });
                
                const boxscore = summaryResponse.data?.boxscore;
                if (!boxscore || !boxscore.players) continue;

                // Loop through team player breakdown blocks in the boxscore
                for (const teamObj of boxscore.players) {
                    const statisticsCategories = teamObj.statistics || [];

                    for (const category of statisticsCategories) {
                        const statName = category.name; // e.g., "passing", "rushing", "receiving"
                        const keys = category.keys || [];
                        const athletes = category.athletes || [];

                        for (const athleteObj of athletes) {
                            const playerId = athleteObj.athlete?.id;
                            if (!playerId) continue;

                            // Initialize player record if first time seen
                            if (!allPlayoffPlayerStats[playerId]) {
                                allPlayoffPlayerStats[playerId] = {
                                    passingTDs: 0,
                                    passingYards: 0,
                                    rushingYards: 0,
                                    receptions: 0,
                                    receivingTDs: 0
                                };
                            }

                            const statsArray = athleteObj.stats || [];

                            // Map keys index to corresponding stat values
                            keys.forEach((key, index) => {
                                const val = statsArray[index];
                                if (!val || val === "--") return;

                                if (statName === 'passing') {
                                    if (key === 'passingTouchdowns') allPlayoffPlayerStats[playerId].passingTDs += parseFloat(val) || 0;
                                    if (key === 'passingYards') allPlayoffPlayerStats[playerId].passingYards += parseFloat(val) || 0;
                                } else if (statName === 'rushing') {
                                    if (key === 'rushingYards') allPlayoffPlayerStats[playerId].rushingYards += parseFloat(val) || 0;
                                } else if (statName === 'receiving') {
                                    if (key === 'receptions') allPlayoffPlayerStats[playerId].receptions += parseFloat(val) || 0;
                                    if (key === 'receivingYards') allPlayoffPlayerStats[playerId].receivingYards += parseFloat(val) || 0;
                                    if (key === 'receivingTouchdowns') allPlayoffPlayerStats[playerId].receivingTDs += parseFloat(val) || 0;
                                }
                            });
                        }
                    }
                }
            } catch (gameErr) {
                console.error(`[Playoff Fantasy Sync] Failed processing summary for game ID ${gameId}:`, gameErr.message);
            }
        }

        const { NflPlayoffsPlayers } = db; 

        if (!NflPlayoffsPlayers) {
            console.warn("[Playoff Fantasy Sync] Warning: 'NflPlayoffsPlayers' model is not defined in db models.");
            return;
        }

        console.log(`[Playoff Fantasy Sync] Calculating and saving fantasy points for ${Object.keys(allPlayoffPlayerStats).length} players...`);

        for (const [playerId, stats] of Object.entries(allPlayoffPlayerStats)) {
            const fantasyPoints = 
                (stats.passingTDs * FANTASY_SCORING.passingTD) +
                (stats.receptions * FANTASY_SCORING.reception) +
                ((stats.rushingYards + stats.receivingYards) * FANTASY_SCORING.yard) +
                (stats.receivingTDs * FANTASY_SCORING.receivingTD);

            const roundedScore = Math.round(fantasyPoints * 100) / 100;

            // Upsert the player's fantasy score record
            await NflPlayoffsPlayers.upsert({
                player_id: playerId,
                fantasy_points: roundedScore,
                updated_at: new Date()
            });
        }

        console.log(`[Playoff Fantasy Sync] Successfully completed player fantasy score sync for all playoff games.`);

    } catch (err) {
        console.error("[Playoff Fantasy Sync] Fatal Error during sync:", err.message);
    }
}

module.exports = syncPlayoffPlayerFantasyScores;