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

function formatSeriesStartDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return null;

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const weekday = weekdays[dateObj.getUTCDay()];
    const month = months[dateObj.getUTCMonth()];
    const day = dateObj.getUTCDate();

    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `Series starts ${weekday}, ${month} ${day}${suffix}`;
}

function formatFirstPitch(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const day = dateObj.getDate();

    const timeStr = dateObj.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase().replace(/\s+/g, '');

    return `Game 1 First Pitch: ${month} ${day}, ${timeStr}`;
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
        let rawEspnSummary = espnSeries?.summary || "";
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

        // Check if this specific matchup/teams already exist in our list for this round
        let existingMatchup = leagueSeriesList.find(s => {
            const teamIds = [String(s.home.team?.id), String(s.away.team?.id)];
            return teamIds.includes(String(homeComp.team?.id)) || teamIds.includes(String(awayComp.team?.id));
        });

        if (!existingMatchup) {
            // If list has room (e.g. max 2 for DS/WC), add it, otherwise find an open slot or create new
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
                rawSeriesSummary: rawEspnSummary,
                seriesCompleted: seriesCompleted,
                roundLabel: ROUND_CONFIG[roundNum].label,
                homeLiveScore: homeScore,
                awayLiveScore: awayScore,
                liveSummary: liveDetail,
                isLive: isLive
            });
        } else {
            existingMatchup.home = homeComp;
            existingMatchup.away = awayComp;
            existingMatchup.homeName = homeName;
            existingMatchup.awayName = awayName;

            if (isGameOne || !existingMatchup.startDate) {
                existingMatchup.startDate = eventDate;
                existingMatchup.isGameOne = isGameOne;
            }

            if ((bracketHomeWins + bracketAwayWins) > (existingMatchup.homeWins + existingMatchup.awayWins)) {
                existingMatchup.homeWins = bracketHomeWins;
                existingMatchup.awayWins = bracketAwayWins;
            }
            if (rawEspnSummary) existingMatchup.rawSeriesSummary = rawEspnSummary;
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

            // Dynamically assign slots based on database placeholders rather than dropping unmatched indexes
            for (let index = 0; index < (roundNum === 1 || roundNum === 2 ? 2 : 1); index++) {
                const placeholderId = roundNum === 4 
                    ? "R4-MLB-WS" 
                    : (roundNum === 3 
                        ? `R3-${league}-CS` 
                        : `R2-${league}-${league === "AL" ? "ALDS" : "NLDS"}${index + 1}` || `R1-${league}-${league === "AL" ? "ALWC" : "NLWC"}${index + 1}`);

                if (roundNum === 1) {
                    // Specific fix for wild card naming format
                    var pId = `R1-${league}-${league === "AL" ? "ALWC" : "NLWC"}${index + 1}`;
                } else {
                    var pId = placeholderId;
                }

                const s = matches[index];
                const existingRow = await MlbPlayoffsSeries.findOne({ where: { id: pId } });

                if (!s) {
                    // If no live match data from ESPN yet for this specific slot, ensure row is preserved or initialized safely
                    continue;
                }

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
                let finalSeriesSummary = "";

                const startDateObj = s.startDate ? new Date(s.startDate) : null;
                const isPlaceholderTime = s.startDate && s.startDate.includes("04:00Z");

                const totalWins = finalHomeWins + finalAwayWins;

                if (isHomeTbd || isAwayTbd || isPlaceholderTime) {
                    const dateFormatted = formatSeriesStartDate(startDateObj);
                    finalSeriesSummary = dateFormatted ? `${dateFormatted}. Time TBD` : "Series starts soon. Time TBD";
                } else if (totalWins > 0 || s.isLive || s.seriesCompleted) {
                    finalSeriesSummary = s.rawSeriesSummary || `Series tied ${finalHomeWins}-${finalAwayWins}`;
                } else {
                    finalSeriesSummary = formatFirstPitch(startDateObj) || "Game 1 First Pitch Scheduled";
                }

                if (s.rawSeriesSummary && homeAbbr && awayAbbr) {
                    if (s.rawSeriesSummary.includes(homeAbbr)) seriesWinnerName = homeTeamName;
                    else if (s.rawSeriesSummary.includes(awayAbbr)) seriesWinnerName = awayTeamName;
                }

                const targetWins = ROUND_CONFIG[roundNum].targetWins;
                if (!seriesWinnerName) {
                    if (finalHomeWins === targetWins) seriesWinnerName = homeTeamName;
                    if (finalAwayWins === targetWins) seriesWinnerName = awayTeamName;
                }

                let seriesOver = s.seriesCompleted || finalHomeWins === targetWins || finalAwayWins === targetWins;
                let seriesStatus = seriesOver ? "STATUS_FINAL" : ((s.isLive || totalWins > 0) ? "STATUS_IN_PROGRESS" : "STATUS_SCHEDULED");

                const now = new Date();
                const isLocked = (startDateObj && now >= startDateObj) || (totalWins > 0);

                const updatePayload = {
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
                    winner: seriesOver ? seriesWinnerName : null,
                    series_length: parsedLength,
                    series_summary: finalSeriesSummary,
                    live_summary: s.isLive ? s.liveSummary : null,
                    home_live_score: s.isLive ? s.homeLiveScore : null,
                    away_live_score: s.isLive ? s.awayLiveScore : null
                };

                await MlbPlayoffsSeries.update(updatePayload, {
                    where: { id: pId }
                });

                console.log(`[MLB Playoffs Sync] Successfully updated slot ${pId} with Away: ${awayTeamName} @ Home: ${homeTeamName}`);
            }
        }
        console.log("[MLB Playoffs Sync Job] Finished syncing MLB postseason series safely.");
    } catch (err) {
        console.error("[MLB Playoffs Sync] Fatal Error:", err.message, err.stack);
    }
}

module.exports = syncMlbPlayoffs;