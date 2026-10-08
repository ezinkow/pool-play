const axios = require("axios");
const db = require("../../models");

const ROUND_CONFIG = {
    1: { label: "Wild Card", maxPoints: 24, targetWins: 2 },
    2: { label: "Division Series", maxPoints: 32, targetWins: 3 },
    3: { label: "League Championship", maxPoints: 16, targetWins: 4 },
    4: { label: "World Series", maxPoints: 8, targetWins: 4 },
};

function getRound(headline = "") {
    const text = headline.toLowerCase();
    if (text.includes("world series") || text.includes("finals")) return 4;
    if (text.includes("championship") || text.includes("alcs") || text.includes("nlcs")) return 3;
    if (text.includes("division") || text.includes("alds") || text.includes("nlds")) return 2;
    return 1;
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

        const homeName = homeComp.team?.displayName || homeComp.team?.name || "TBD";
        const awayName = awayComp.team?.displayName || awayComp.team?.name || "TBD";

        const homeScore = homeComp.score !== undefined && homeComp.score !== null ? parseInt(homeComp.score, 10) : null;
        const awayScore = awayComp.score !== undefined && awayComp.score !== null ? parseInt(awayComp.score, 10) : null;

        const statusState = comp.status?.type?.state;
        const statusName = comp.status?.type?.name;
        const liveDetail = comp.status?.type?.shortDetail || comp.status?.type?.detail || null;

        const isLive = statusState === "in" || statusName === "STATUS_IN_PROGRESS";

        const espnSeries = comp.series;
        let bracketHomeWins = 0;
        let bracketAwayWins = 0;
        let seriesSummaryText = espnSeries?.summary || "";
        let seriesCompleted = espnSeries?.completed || false;

        if (espnSeries?.competitors) {
            const bHomeData = espnSeries.competitors.find(c => String(c.id) === String(homeComp.team?.id));
            const bAwayData = espnSeries.competitors.find(c => String(c.id) === String(awayComp.team?.id));
            bracketHomeWins = bHomeData ? (bHomeData.wins || 0) : 0;
            bracketAwayWins = bAwayData ? (bAwayData.wins || 0) : 0;
        }

        let eventDate = event.startDate || event.date;
        const isGameOne = headline.toLowerCase().includes("game 1");

        const groupKey = `${roundNum}-${league}`;
        if (!seriesMap.has(groupKey)) {
            seriesMap.set(groupKey, []);
        }

        const leagueSeriesList = seriesMap.get(groupKey);

        // Match existing matchup based on rounded series group rather than sloppy team ID flipping
        let existingMatchup = leagueSeriesList.find(s => s.roundNum === roundNum && s.league === league);

        if (!existingMatchup) {
            leagueSeriesList.push({
                roundNum,
                league,
                home: homeComp,
                away: awayComp,
                homeName,
                awayName,
                startDate: eventDate,
                isGameOne: isGameOne,
                homeWins: bracketHomeWins,
                awayWins: bracketAwayWins,
                seriesSummary: seriesSummaryText,
                seriesCompleted: seriesCompleted,
                roundLabel: headline.replace(/ - Game \d+/i, "") || ROUND_CONFIG[roundNum].label,
                homeLiveScore: homeScore,
                awayLiveScore: awayScore,
                liveSummary: liveDetail,
                isLive: isLive
            });
        } else {
            // Strictly respect ESPN's home/away slot assignment and update team info from the event
            existingMatchup.home = homeComp;
            existingMatchup.away = awayComp;
            existingMatchup.homeName = homeName;
            existingMatchup.awayName = awayName;

            // If this event is Game 1, override the start date with Game 1's exact timestamp
            if (isGameOne || !existingMatchup.startDate) {
                existingMatchup.startDate = eventDate;
                existingMatchup.isGameOne = isGameOne;
            }

            if ((bracketHomeWins + bracketAwayWins) > (existingMatchup.homeWins + existingMatchup.awayWins)) {
                existingMatchup.homeWins = bracketHomeWins;
                existingMatchup.awayWins = bracketAwayWins;
            }
            if (seriesSummaryText) existingMatchup.seriesSummary = seriesSummaryText;
            if (seriesCompleted) existingMatchup.seriesCompleted = true;
            if (isLive) {
                existingMatchup.homeLiveScore = homeScore;
                existingMatchup.awayLiveScore = awayScore;
                existingMatchup.liveSummary = liveDetail;
                existingMatchup.isLive = true;
            }
        }
    });
}

async function syncMlbPlayoffs() {
    console.log("[MLB Playoffs Sync Job] Starting MLB Postseason synchronization...");
    try {
        const rawSeriesMap = new Map();
        const startDate = new Date(2026, 8, 29);
        const endDate = new Date(2026, 10, 2);

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
                // Skip empty days
            }
        }

        const { MlbPlayoffsSeries, MlbTeams } = db;

        const mlbHRecord = await MlbTeams.findOne({ where: { name: "MLBH" } });
        const mlbARecord = await MlbTeams.findOne({ where: { name: "MLBA" } });
        const tbdRecord = await MlbTeams.findOne({ where: { name: "TBD" } });

        const mlbHLogo = mlbHRecord?.logo || tbdRecord?.logo || null;
        const mlbALogo = mlbARecord?.logo || tbdRecord?.logo || null;

        for (const [groupKey, matches] of rawSeriesMap.entries()) {
            const [roundStr, league] = groupKey.split("-");
            const roundNum = parseInt(roundStr, 10);

            for (const [index, s] of matches.entries()) {
                const placeholderId = getPlaceholderId(roundNum, league, index);
                if (!placeholderId) continue;

                const existingRow = await MlbPlayoffsSeries.findOne({ where: { id: placeholderId } });

                const homeTeamId = parseInt(s.home.team?.id || "0", 10);
                const awayTeamId = parseInt(s.away.team?.id || "0", 10);
                
                const isHomeTbd = homeTeamId < 0;
                const isAwayTbd = awayTeamId < 0;

                const homeTeamName = s.homeName;
                const awayTeamName = s.awayName;

                const homeTeamRecord = !isHomeTbd ? await MlbTeams.findOne({ where: { name: homeTeamName } }) : null;
                const awayTeamRecord = !isAwayTbd ? await MlbTeams.findOne({ where: { name: awayTeamName } }) : null;

                const homeLogo = isHomeTbd
                    ? (mlbHLogo || existingRow?.home_logo || null)
                    : (s.home.team?.logo || homeTeamRecord?.logo || existingRow?.home_logo || null);

                const awayLogo = isAwayTbd
                    ? (mlbALogo || existingRow?.away_logo || null)
                    : (s.away.team?.logo || awayTeamRecord?.logo || existingRow?.away_logo || null);

                let finalHomeWins = s.homeWins;
                let finalAwayWins = s.awayWins;
                let seriesWinnerName = null;
                let parsedLength = (finalHomeWins + finalAwayWins) > 0 ? (finalHomeWins + finalAwayWins) : null;

                const homeAbbr = s.home.team?.abbreviation;
                const awayAbbr = s.away.team?.abbreviation;
                const summaryText = s.seriesSummary || "";

                if (summaryText && homeAbbr && awayAbbr) {
                    if (summaryText.includes(homeAbbr)) seriesWinnerName = homeTeamName;
                    else if (summaryText.includes(awayAbbr)) seriesWinnerName = awayTeamName;
                }

                const targetWins = ROUND_CONFIG[roundNum].targetWins;
                if (!seriesWinnerName) {
                    if (finalHomeWins === targetWins) seriesWinnerName = homeTeamName;
                    if (finalAwayWins === targetWins) seriesWinnerName = awayTeamName;
                }

                let seriesOver = s.seriesCompleted || finalHomeWins === targetWins || finalAwayWins === targetWins;
                let seriesStatus = seriesOver ? "STATUS_FINAL" : ((s.isLive || finalHomeWins + finalAwayWins > 0) ? "STATUS_IN_PROGRESS" : "STATUS_SCHEDULED");

                const now = new Date();
                const startTime = s.startDate ? new Date(s.startDate) : null;
                const isLocked = (startTime && now >= startTime) || (finalHomeWins + finalAwayWins > 0);

                const updatePayload = {
                    round: roundNum,
                    round_label: s.roundLabel || ROUND_CONFIG[roundNum].label,
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
                    winner: seriesOver ? seriesWinnerName : null,
                    series_length: parsedLength,
                    live_summary: s.isLive ? s.liveSummary : null,
                    home_live_score: s.isLive ? s.homeLiveScore : null,
                    away_live_score: s.isLive ? s.awayLiveScore : null
                };

                await MlbPlayoffsSeries.update(updatePayload, {
                    where: { id: placeholderId }
                });

                console.log(`[MLB Playoffs Sync] Successfully updated placeholder slot ${placeholderId} with Away: ${awayTeamName} @ Home: ${homeTeamName}`);
            }
        }
        console.log("[MLB Playoffs Sync Job] Finished syncing MLB postseason series safely.");
    } catch (err) {
        console.error("[MLB Playoffs Sync] Fatal Error:", err.message, err.stack);
    }
}

module.exports = syncMlbPlayoffs;