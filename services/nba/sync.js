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
    // East
    "Detroit Pistons": 1, "Boston Celtics": 2,
    "New York Knicks": 3, "Cleveland Cavaliers": 4,
    "Toronto Raptors": 5, "Atlanta Hawks": 6,
    "Philadelphia 76ers": 7, "Orlando Magic": 7, "76ers/Magic": 7,
    // West
    "Oklahoma City Thunder": 1, "San Antonio Spurs": 2,
    "Denver Nuggets": 3, "Los Angeles Lakers": 4,
    "Houston Rockets": 5, "Minnesota Timberwolves": 6,
    "Phoenix Suns": 7, "Portland Trail Blazers": 7, "Suns/Trail Blazers": 7,
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

function makeSeriesId(roundNum, conf, s) {
    let hSeed = TEAM_TO_SEED[s.home.team.displayName] || s.home.seed;
    let aSeed = TEAM_TO_SEED[s.away.team.displayName] || s.away.seed;

    if (roundNum === 2) {
        if ([1, 8, 4, 5].includes(Number(hSeed))) hSeed = [1, 8].includes(Number(hSeed)) ? 1 : 4;
        if ([1, 8, 4, 5].includes(Number(aSeed))) aSeed = [1, 8].includes(Number(aSeed)) ? 1 : 4;

        if ([2, 7, 3, 6].includes(Number(hSeed))) hSeed = [2, 7].includes(Number(hSeed)) ? 2 : 3;
        if ([2, 7, 3, 6].includes(Number(aSeed))) aSeed = [2, 7].includes(Number(aSeed)) ? 2 : 3;
    }

    hSeed = hSeed || "TBD";
    aSeed = aSeed || "TBD";

    const pair = [hSeed, aSeed].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
    );

    return `R${roundNum}-${conf}-${pair[0]}-${pair[1]}`;
}

function extractSeries(data) {
    if (!data?.events) return [];
    const seriesMap = new Map();

    data.events.forEach(event => {
        const comp = event.competitions?.[0];
        if (!comp) return;

        const homeComp = comp.competitors.find(c => c.homeAway === "home");
        const awayComp = comp.competitors.find(c => c.homeAway === "away");

        if (!homeComp || !awayComp || homeComp.team.displayName.includes("/") || homeComp.team.displayName === "TBD") return;

        const headline = comp.notes?.[0]?.headline || "";
        const roundNum = getRound(headline);
        const conf = getConference(headline);

        // 1. Identify true bracket seeds to establish who owns Home Court Advantage for the SERIES
        const hSeed = TEAM_TO_SEED[homeComp.team.displayName] || homeComp.seed;
        const aSeed = TEAM_TO_SEED[awayComp.team.displayName] || awayComp.seed;

        // The lower numerical seed (e.g., 2 seed vs 6 seed) is the Bracket Home Team
        const bracketHomeComp = Number(hSeed) <= Number(aSeed) ? homeComp : awayComp;
        const bracketAwayComp = Number(hSeed) <= Number(aSeed) ? awayComp : homeComp;

        // Use your consistent ID mapping rules
        const seriesId = makeSeriesId(roundNum, conf, { home: homeComp, away: awayComp });
        const espnSeries = comp.series;

        let bracketHomeWins = 0;
        let bracketAwayWins = 0;

        // 2. Extract wins from ESPN matched against Bracket structures, not single game locations
        if (espnSeries?.competitors) {
            const bHomeData = espnSeries.competitors.find(c => String(c.id) === String(bracketHomeComp.team.id));
            const bAwayData = espnSeries.competitors.find(c => String(c.id) === String(bracketAwayComp.team.id));

            bracketHomeWins = bHomeData ? (bHomeData.wins || 0) : 0;
            bracketAwayWins = bAwayData ? (bAwayData.wins || 0) : 0;
        }

        // 3. Construct your deduplicated series object using static Bracket alignment properties
        if (!seriesMap.has(seriesId)) {
            seriesMap.set(seriesId, {
                id: seriesId,
                roundNum,
                conf,
                home: bracketHomeComp, // Locked to true Series higher seed
                away: bracketAwayComp, // Locked to true Series lower seed
                homeLogo: bracketHomeComp.team.logo,
                awayLogo: bracketAwayComp.team.logo,
                status: comp.status,
                startDate: event.date,
                homeWins: bracketHomeWins, // True higher-seed wins
                awayWins: bracketAwayWins, // True lower-seed wins
                roundLabel: headline || roundNum
            });
        } else {
            const existing = seriesMap.get(seriesId);
            if ((bracketHomeWins + bracketAwayWins) > (existing.homeWins + existing.awayWins)) {
                existing.homeWins = bracketHomeWins;
                existing.awayWins = bracketAwayWins;
                seriesMap.set(seriesId, existing);
            }
        }
    });

    return Array.from(seriesMap.values());
}

async function processSeries(s) {
    const { NbaSeries } = db;
    try {
        const roundCfg = ROUND_CONFIG[s.roundNum];

        // Pull the summary text directly from the active competition series metadata block
        // s.status.summary might be nested depending on how it's passed, 
        // but it originates from comp.series.summary
        const summaryText = s.roundLabel?.series?.summary || "";

        let finalHomeWins = s.homeWins;
        let finalAwayWins = s.awayWins;
        let seriesOver = finalHomeWins === 4 || finalAwayWins === 4;
        let parsedLength = null;
        let seriesWinnerName = null;

        // REGEX PARSER: Matches patterns like "SA wins series 4-2" or "Spurs win series 4-2"
        const seriesRegex = /wins?\s+series\s+(\d+)-(\d+)/i;
        const match = summaryText.match(seriesRegex);

        if (match) {
            seriesOver = true;
            const textWinCount = parseInt(match[1], 10); // The winner's score (always 4)
            const textLossCount = parseInt(match[2], 10); // The loser's score (0-3)
            parsedLength = textWinCount + textLossCount;   // Total games played (4-7)

            // Determine if the home team or away team matches the winner text signature
            const isHomeWinner = summaryText.toLowerCase().includes(s.home.team.name.toLowerCase()) ||
                summaryText.toLowerCase().includes(s.home.team.abbreviation.toLowerCase()) ||
                summaryText.toLowerCase().includes(s.home.team.shortDisplayName.toLowerCase());

            if (isHomeWinner) {
                finalHomeWins = textWinCount; // 4
                finalAwayWins = textLossCount; // e.g., 2
                seriesWinnerName = s.home.team.displayName;
            } else {
                finalAwayWins = textWinCount; // 4
                finalHomeWins = textLossCount; // e.g., 2
                seriesWinnerName = s.away.team.displayName;
            }
        } else {
            // Fallback to traditional win calculation if summary regex doesn't match yet
            if (seriesOver) {
                parsedLength = finalHomeWins + finalAwayWins;
                seriesWinnerName = finalHomeWins === 4 ? s.home.team.displayName : s.away.team.displayName;
            }
        }

        let seriesStatus = "STATUS_SCHEDULED";
        if (seriesOver) {
            seriesStatus = "STATUS_FINAL";
        } else if (finalHomeWins + finalAwayWins > 0) {
            seriesStatus = "STATUS_IN_PROGRESS";
        }

        const now = new Date();
        const startTime = new Date(s.startDate);
        // Lock if the game has started OR if any wins are recorded
        const isLocked = (now >= startTime) || (finalHomeWins + finalAwayWins > 0);

        await NbaSeries.upsert({
            id: s.id,
            round: s.roundNum,
            round_label: roundCfg.label,
            round_points_max: roundCfg.maxPoints,
            home_team: s.home.team.displayName,
            away_team: s.away.team.displayName,
            home_logo: s.homeLogo,
            away_logo: s.awayLogo,
            home_seed: TEAM_TO_SEED[s.home.team.displayName] || s.home.seed,
            away_seed: TEAM_TO_SEED[s.away.team.displayName] || s.away.seed,
            status: seriesStatus,
            game_date: s.startDate,
            home_wins: finalHomeWins,
            away_wins: finalAwayWins,
            locked: isLocked,
            winner: seriesWinnerName,
            series_length: parsedLength
        });

        console.log(`[NBA sync] ${s.id}: ${finalAwayWins}-${finalHomeWins} | ${seriesStatus} | Length: ${parsedLength}`);
    } catch (err) {
        console.error(`[NBA sync] Error on ${s.id}:`, err.message);
    }
}

async function syncNba() {
    try {
        console.log("[NBA sync] Starting fetch...");
        const { data } = await axios.get(SCOREBOARD_URL, { timeout: 15000 });
        const series = extractSeries(data);

        if (!series.length) {
            console.log("[NBA sync] No series found.");
            return;
        }

        for (const s of series) {
            await processSeries(s);
        }
        console.log(`[NBA sync] Finished. Updated ${series.length} series.`);
    } catch (err) {
        console.error("[NBA sync] Fatal Error:", err.message);
    }
}

module.exports = syncNba;