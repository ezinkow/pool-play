const axios = require("axios");
const db = require("../../models");

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20260418-20260620";

const ROUND_CONFIG = {
    1: { label: "R1", maxPoints: 32 },
    2: { label: "R2", maxPoints: 24 },
    3: { label: "R3", maxPoints: 16 },
    4: { label: "Finals", maxPoints: 8 },
};

const TEAM_TO_SEED = {
    "Detroit Pistons": 1, "Boston Celtics": 2, "New York Knicks": 3, "Cleveland Cavaliers": 4,
    "Toronto Raptors": 5, "Atlanta Hawks": 6, "Philadelphia 76ers": 7, "Orlando Magic": 7,
    "Oklahoma City Thunder": 1, "San Antonio Spurs": 2, "Denver Nuggets": 3, "Los Angeles Lakers": 4,
    "Houston Rockets": 5, "Minnesota Timberwolves": 6, "Phoenix Suns": 7, "Portland Trail Blazers": 7,
};

function getRound(headline) {
    if (headline && headline.includes("Finals") && !headline.includes("West") && !headline.includes("East")) return 4;
    if (headline && (headline.includes("West Finals") || headline.includes("East Finals"))) return 3;
    if (headline && (headline.includes("West Semifinals") || headline.includes("East Semifinals"))) return 2;
    return 1;
}

function getConference(headline) {
    if (!headline) return "";
    if (headline.includes("East")) return "E";
    if (headline.includes("West")) return "W";
    return "";
}

// 🧠 STABLE ID GENERATOR: Prevents duplicates when Home/Away swaps venue
function makeSeriesId(roundNum, conf, homeName, awayName) {
    const teams = [homeName, awayName].sort();
    const teamString = teams.join("-vs-").replace(/\s+/g, '');
    return `R${roundNum}-${conf}-${teamString}`;
}

function extractSeries(data) {
    if (!data?.events) return [];
    const seriesMap = new Map();

    data.events.forEach(event => {
        const comp = event.competitions?.[0];
        if (!comp) return;

        const homeComp = comp.competitors.find(c => c.homeAway === "home");
        const awayComp = comp.competitors.find(c => c.homeAway === "away");

        if (!homeComp || !awayComp) return;

        const headline = comp.notes?.[0]?.headline || "";
        const roundNum = getRound(headline);
        const conf = getConference(headline);

        const seriesId = makeSeriesId(roundNum, conf, homeComp.team.displayName, awayComp.team.displayName);
        const espnSeries = comp.series;

        // Track wins
        const hWins = espnSeries?.competitors?.find(c => String(c.id) === String(homeComp.team.id))?.wins || 0;
        const aWins = espnSeries?.competitors?.find(c => String(c.id) === String(awayComp.team.id))?.wins || 0;

        if (!seriesMap.has(seriesId)) {
            seriesMap.set(seriesId, {
                id: seriesId,
                roundNum, conf,
                home: homeComp, away: awayComp,
                startDate: event.date,
                homeWins: hWins, awayWins: aWins,
                roundLabel: headline || roundNum
            });
        } else {
            const existing = seriesMap.get(seriesId);
            existing.homeWins = Math.max(existing.homeWins, hWins);
            existing.awayWins = Math.max(existing.awayWins, aWins);
        }
    });
    return Array.from(seriesMap.values());
}

async function processSeries(s) {
    const { NbaSeries } = db;
    try {
        const roundCfg = ROUND_CONFIG[s.roundNum];
        const totalWins = s.homeWins + s.awayWins;
        const seriesOver = totalWins >= 4;
        
        const isLocked = new Date() >= new Date(s.startDate) || totalWins > 0;

        await NbaSeries.upsert({
            id: s.id,
            round: s.roundNum,
            round_label: roundCfg.label,
            round_points_max: roundCfg.maxPoints,
            home_team: s.home.team.displayName,
            away_team: s.away.team.displayName,
            status: seriesOver ? "STATUS_FINAL" : (totalWins > 0 ? "STATUS_IN_PROGRESS" : "STATUS_SCHEDULED"),
            game_date: s.startDate,
            home_wins: s.homeWins,
            away_wins: s.awayWins,
            locked: isLocked,
            winner: seriesOver ? (s.homeWins === 4 ? s.home.team.displayName : s.away.team.displayName) : null
        });
    } catch (err) {
        console.error(`[NBA sync] Error on ${s.id}:`, err.message);
    }
}

async function syncNba() {
    try {
        const { data } = await axios.get(SCOREBOARD_URL, { timeout: 15000 });
        const series = extractSeries(data);
        for (const s of series) await processSeries(s);
    } catch (err) {
        console.error("[NBA sync] Fatal Error:", err.message);
    }
}

module.exports = syncNba;













// function makeSeriesId(roundNum, conf, s) {
//     // let hSeed = TEAM_TO_SEED[s.home.team.displayName] || s.home.seed;
//     // let aSeed = TEAM_TO_SEED[s.away.team.displayName] || s.away.seed;
//     const teams = [s.home.team.displayName, s.away.team.displayName].sort();
//     const teamString = teams.join("-vs-").replace(/\s+/g, '');
    
//     // if (roundNum === 2) {
//     //     if ([1, 8, 4, 5].includes(Number(hSeed))) hSeed = [1, 8].includes(Number(hSeed)) ? 1 : 4;
//     //     if ([1, 8, 4, 5].includes(Number(aSeed))) aSeed = [1, 8].includes(Number(aSeed)) ? 1 : 4;
    
//     //     if ([2, 7, 3, 6].includes(Number(hSeed))) hSeed = [2, 7].includes(Number(hSeed)) ? 2 : 3;
//     //     if ([2, 7, 3, 6].includes(Number(aSeed))) aSeed = [2, 7].includes(Number(aSeed)) ? 2 : 3;
//     // }

//     // hSeed = hSeed || "TBD";
//     // aSeed = aSeed || "TBD";
    
//     // const pair = [hSeed, aSeed].sort((a, b) =>
//         //     String(a).localeCompare(String(b), undefined, { numeric: true })
//     // );

//     return `R${roundNum}-${conf}-${teamString}`;
//     // return `R${roundNum}-${conf}-${pair[0]}-${pair[1]}`;
// }