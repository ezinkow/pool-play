const axios = require("axios");
const db = require("../../models");

const ROUND_CONFIG = {
    1: { label: "Wild Card", maxPoints: 24, targetWins: 2 }, // Best-of-3 (First to 2 wins)
    2: { label: "Division Series", maxPoints: 32, targetWins: 3 }, // Best-of-5 (First to 3 wins)
    3: { label: "League Championship", maxPoints: 16, targetWins: 4 }, // Best-of-7 (First to 4 wins)
    4: { label: "World Series", maxPoints: 8, targetWins: 4 }, // Best-of-7 (First to 4 wins)
};

function getRound(headline = "") {
    const text = headline.toLowerCase();
    if (text.includes("world series") || text.includes("finals")) return 4;
    if (text.includes("championship") || text.includes("alcs") || text.includes("nlcs")) return 3;
    if (text.includes("division") || text.includes("alds") || text.includes("nlds")) return 2;
    return 1; // Wild Card
}

function getLeague(headline = "") {
    const text = headline.toLowerCase();
    if (text.includes("american") || text.includes("al")) return "AL";
    if (text.includes("national") || text.includes("nl")) return "NL";
    if (text.includes("world series")) return "MLB";
    return "";
}

function getPlaceholderId(roundNum, league, index) {
    if (roundNum === 4) return "R4-MLB-WS";
    if (roundNum === 3) return `R3-${league}-CS`;
    if (roundNum === 2) return `R2-${league}-${league === "AL" ? "ALDS" : "NLDS"}${index + 1}`;
    if (roundNum === 1) return `R1-${league}-${league === "AL" ? "ALWC" : "NLWC"}${index + 1}`;
    return null;
}

function extractSeries(data, seriesMap) {
    if (!data?.events) return;

    data.events.forEach(event => {
        const comp = event.competitions?.[0];
        if (!comp) return;

        const homeComp = comp.competitors.find(c => c.homeAway === "home");
        const awayComp = comp.competitors.find(c => c.homeAway === "away");

        if (!homeComp || !awayComp) return;

        const headline = comp.notes?.[0]?.headline || comp.name || "";
        const roundNum = getRound(headline);
        const league = getLeague(headline);

        const homeName = homeComp.team?.displayName || "TBD Home";
        const awayName = awayComp.team?.displayName || "TBD Away";

        const homeId = String(homeComp.team?.id || homeName);
        const awayId = String(awayComp.team?.id || awayName);

        const espnSeries = comp.series;
        let bracketHomeWins = 0;
        let bracketAwayWins = 0;

        if (espnSeries?.competitors) {
            const bHomeData = espnSeries.competitors.find(c => String(c.id) === String(homeComp.team?.id));
            const bAwayData = espnSeries.competitors.find(c => String(c.id) === String(awayComp.team?.id));
            bracketHomeWins = bHomeData ? (bHomeData.wins || 0) : 0;
            bracketAwayWins = bAwayData ? (bAwayData.wins || 0) : 0;
        }

        const groupKey = `${roundNum}-${league}`;
        if (!seriesMap.has(groupKey)) {
            seriesMap.set(groupKey, []);
        }
        
        const leagueSeriesList = seriesMap.get(groupKey);
        
        // ✨ Match strictly by the unique pairing of both team IDs (order-independent)
        let existingMatchup = leagueSeriesList.find(s => {
            const sTeamIds = [String(s.home.team?.id || s.homeName), String(s.away.team?.id || s.awayName)];
            return sTeamIds.includes(homeId) && sTeamIds.includes(awayId);
        });

        if (!existingMatchup) {
            leagueSeriesList.push({
                roundNum,
                league,
                home: homeComp,
                away: awayComp,
                homeName,
                awayName,
                startDate: event.date,
                homeWins: bracketHomeWins,
                awayWins: bracketAwayWins,
                roundLabel: headline || ROUND_CONFIG[roundNum].label
            });
        } else {
            if (new Date(event.date) < new Date(existingMatchup.startDate)) {
                existingMatchup.startDate = event.date;
            }
            if ((bracketHomeWins + bracketAwayWins) > (existingMatchup.homeWins + existingMatchup.awayWins)) {
                existingMatchup.homeWins = bracketHomeWins;
                existingMatchup.awayWins = bracketAwayWins;
            }
        }
    });
}

async function syncMlb() {
    console.log("[MLB Sync Job] Starting MLB Postseason synchronization...");
    try {
        const rawSeriesMap = new Map();

        const startDate = new Date(2026, 9, 1); // October 1, 2026
        const endDate = new Date(2026, 10, 2);   // Early November

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const dateStr = `${yyyy}${mm}${dd}`;

            try {
                const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateStr}`;
                const { data } = await axios.get(url, { timeout: 10000 });
                extractSeries(data, rawSeriesMap);
            } catch (dayErr) {
                // Skip empty days silently
            }
        }

        const { MlbSeries, MlbTeams } = db;

        const tbdRecord = await MlbTeams.findOne({ where: { name: "TBD" } });
        const globalTbdLogo = tbdRecord ? tbdRecord.logo : null;

        for (const [groupKey, matches] of rawSeriesMap.entries()) {
            const [roundStr, league] = groupKey.split("-");
            const roundNum = parseInt(roundStr, 10);

            for (const [index, s] of matches.entries()) {
                const placeholderId = getPlaceholderId(roundNum, league, index);
                if (!placeholderId) continue;

                const targetWins = ROUND_CONFIG[roundNum].targetWins;
                let finalHomeWins = s.homeWins;
                let finalAwayWins = s.awayWins;
                let seriesOver = finalHomeWins === targetWins || finalAwayWins === targetWins;
                let parsedLength = null;
                let seriesWinnerName = null;

                if (seriesOver) {
                    parsedLength = finalHomeWins + finalAwayWins;
                    seriesWinnerName = finalHomeWins === targetWins ? s.homeName : s.awayName;
                }

                let seriesStatus = seriesOver ? "STATUS_FINAL" : (finalHomeWins + finalAwayWins > 0 ? "STATUS_IN_PROGRESS" : "STATUS_SCHEDULED");
                const now = new Date();
                const startTime = new Date(s.startDate);
                const isLocked = (now >= startTime) || (finalHomeWins + finalAwayWins > 0);

                const existingRow = await MlbSeries.findOne({ where: { id: placeholderId } });

                let rawHome = s.homeName;
                if (!rawHome || rawHome === "TBD" || rawHome.startsWith("TBD")) {
                    rawHome = "TBDH";
                }
                let rawAway = s.awayName;
                if (!rawAway || rawAway === "TBD" || rawAway.startsWith("TBD")) {
                    rawAway = "TBDA";
                }

                const homeTeamName = (rawHome === "TBDH" && existingRow?.home_team && existingRow.home_team !== "TBD") ? existingRow.home_team : rawHome;
                const awayTeamName = (rawAway === "TBDA" && existingRow?.away_team && existingRow.away_team !== "TBD") ? existingRow.away_team : rawAway;

                const homeTeamRecord = await MlbTeams.findOne({ where: { name: homeTeamName } });
                const awayTeamRecord = await MlbTeams.findOne({ where: { name: awayTeamName } });

                const homeLogo = s.home.team?.logo || homeTeamRecord?.logo || globalTbdLogo || existingRow?.home_logo || null;
                const awayLogo = s.away.team?.logo || awayTeamRecord?.logo || globalTbdLogo || existingRow?.away_logo || null;

                await MlbSeries.update({
                    round: roundNum,
                    round_label: ROUND_CONFIG[roundNum].label,
                    round_points_max: ROUND_CONFIG[roundNum].maxPoints,
                    league: league,
                    home_team: homeTeamName,
                    away_team: awayTeamName,
                    home_logo: homeLogo,
                    away_logo: awayLogo,
                    home_seed: s.home.seed || existingRow?.home_seed || null,
                    away_seed: s.away.seed || existingRow?.away_seed || null,
                    status: seriesStatus,
                    game_date: s.startDate || existingRow?.game_date,
                    home_wins: finalHomeWins,
                    away_wins: finalAwayWins,
                    locked: isLocked,
                    winner: seriesWinnerName,
                    series_length: parsedLength
                }, {
                    where: { id: placeholderId }
                });

                console.log(`[MLB Sync] Updated placeholder slot ${placeholderId} with ${awayTeamName} @ ${homeTeamName}`);
            }
        }

        console.log("[MLB Sync Job] Finished syncing MLB postseason series safely.");
    } catch (err) {
        console.error("[MLB sync] Fatal Error:", err.message);
    }
}

module.exports = syncMlb;