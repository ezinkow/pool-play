const axios = require("axios");
const db = require("../../models");

// 🧠 Centralized Season Weeks Definition (Monday-to-Sunday boundaries for NCAAB)
const NCAAB_WEEKS = [
    { week: 1, start: new Date("2026-11-02T00:00:00"), end: new Date("2026-11-08T23:59:59") },
    { week: 2, start: new Date("2026-11-09T00:00:00"), end: new Date("2026-11-15T23:59:59") },
    { week: 3, start: new Date("2026-11-16T00:00:00"), end: new Date("2026-11-22T23:59:59") },
    { week: 4, start: new Date("2026-11-23T00:00:00"), end: new Date("2026-11-29T23:59:59") },
    { week: 5, start: new Date("2026-11-30T00:00:00"), end: new Date("2026-12-06T23:59:59") },
    { week: 6, start: new Date("2026-12-07T00:00:00"), end: new Date("2026-12-13T23:59:59") },
    { week: 7, start: new Date("2026-12-14T00:00:00"), end: new Date("2026-12-20T23:59:59") },
    { week: 8, start: new Date("2026-12-21T00:00:00"), end: new Date("2027-01-03T23:59:59") },
    { week: 9, start: new Date("2027-01-04T00:00:00"), end: new Date("2027-01-10T23:59:59") },
    { week: 10, start: new Date("2027-01-11T00:00:00"), end: new Date("2027-01-17T23:59:59") },
    { week: 11, start: new Date("2027-01-18T00:00:00"), end: new Date("2027-01-24T23:59:59") },
    { week: 12, start: new Date("2027-01-25T00:00:00"), end: new Date("2027-01-31T23:59:59") },
    { week: 13, start: new Date("2027-02-01T00:00:00"), end: new Date("2027-02-07T23:59:59") },
    { week: 14, start: new Date("2027-02-08T00:00:00"), end: new Date("2027-02-14T23:59:59") },
    { week: 15, start: new Date("2027-02-15T00:00:00"), end: new Date("2027-02-21T23:59:59") },
    { week: 16, start: new Date("2027-02-22T00:00:00"), end: new Date("2027-02-28T23:59:59") },
    { week: 17, start: new Date("2027-03-01T00:00:00"), end: new Date("2027-03-07T23:59:59") }
];

/**
 * 🧠 DYNAMIC CURRENT WEEK CALCULATOR
 */
function getCurrentNcaabWeek() {
    const now = new Date();
    let activeIndex = 0;
    for (let i = NCAAB_WEEKS.length - 1; i >= 0; i--) {
        if (now >= NCAAB_WEEKS[i].start) {
            activeIndex = i;
            break;
        }
    }
    return NCAAB_WEEKS[activeIndex].week;
}

function applyHookRule(spread, odds) {
    if (spread === null || spread === undefined) return spread;

    let absVal = Math.abs(spread);
    let adjustedAbs = absVal;

    const isWholeNumber = Number.isInteger(absVal);
    if (isWholeNumber) {
        if (odds !== null && odds !== undefined && odds >= -110) {
            adjustedAbs = absVal - 0.5;
        } else {
            adjustedAbs = absVal + 0.5;
        }
    }
    return -adjustedAbs;
}

/**
 * Helper to generate YYYYMMDD string from a Date object
 */
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

const CONFERENCE_MAP = {
    "2": "ACC",
    "8": "Big 12",
    "4": "Big East",
    "7": "Big Ten",
    "23": "SEC"
};

function getConferenceName(confId) {
    return CONFERENCE_MAP[String(confId)] || "Other";
}

/**
 * 🧠 FETCH TEAM RANKINGS FROM ESPN CORE API BY WEEK
 */
async function fetchTeamRankings(weekNumber) {
    const rankingsMap = {};
    try {
        const rankingsUrl = `http://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2026/types/2/weeks/${weekNumber}/rankings/1?lang=en&region=us`;
        const { data } = await axios.get(rankingsUrl, { timeout: 10000 });
        const ranksArray = data?.ranks || [];

        ranksArray.forEach(item => {
            const currentRank = item.current;
            const teamRef = item.team?.$ref;

            if (currentRank && teamRef) {
                const match = teamRef.match(/\/teams\/(\d+)\?/);
                if (match && match[1]) {
                    const teamId = match[1];
                    rankingsMap[teamId] = parseInt(currentRank, 10);
                }
            }
        });
    } catch (err) {
        console.log(`[NCAAB Sync] Rankings endpoint for Week ${weekNumber} not active or returned error.`);
    }
    return rankingsMap;
}

async function extractMatchups(events, weekNum) {
    if (!events || !Array.isArray(events)) return [];
    const matchups = [];
    const validConferenceIds = Object.keys(CONFERENCE_MAP);

    const rankingsMap = await fetchTeamRankings(weekNum);
    const { NcaabRegularSeasonGames } = db;

    for (const event of events) {
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) continue;

        const homeConfId = String(homeCompetitor.team?.conferenceId || "");
        const awayConfId = String(awayCompetitor.team?.conferenceId || "");

        // 🧠 Filtering for only the conferences defined in CONFERENCE_MAP
        const isTargetConferenceGame = validConferenceIds.includes(homeConfId) || validConferenceIds.includes(awayConfId);
        if (!isTargetConferenceGame) continue;

        const gameId = event.id;
        const gameDate = event.date;

        const homeTeamId = homeCompetitor.team.id;
        const awayTeamId = awayCompetitor.team.id;

        const homeTeamSchool = homeCompetitor.team.shortDisplayName || homeCompetitor.team.location;
        const awayTeamSchool = awayCompetitor.team.shortDisplayName || awayCompetitor.team.location;

        const homeTeamMascot = homeCompetitor.team.name || homeCompetitor.team.nickname;
        const awayTeamMascot = awayCompetitor.team.name || awayCompetitor.team.nickname;

        const homeColor = homeCompetitor.team.color ? `#${homeCompetitor.team.color.replace('#', '')}` : null;
        const homeSecondaryColor = homeCompetitor.team.alternateColor ? `#${homeCompetitor.team.alternateColor.replace('#', '')}` : (homeCompetitor.team.secondaryColor ? `#${homeCompetitor.team.secondaryColor.replace('#', '')}` : null);

        const awayColor = awayCompetitor.team.color ? `#${awayCompetitor.team.color.replace('#', '')}` : null;
        const awaySecondaryColor = awayCompetitor.team.alternateColor ? `#${awayCompetitor.team.alternateColor.replace('#', '')}` : (awayCompetitor.team.secondaryColor ? `#${awayCompetitor.team.secondaryColor.replace('#', '')}` : null);

        const existingGame = await NcaabRegularSeasonGames.findOne({
            where: { id: gameId }
        });

        let rawSpread = null;
        let favoriteTeamSchool = homeTeamSchool;
        let favoriteTeamId = homeTeamId;

        const oddsObj = Array.isArray(comp.odds) ? comp.odds[0] : comp.odds;

        if (oddsObj) {
            if (oddsObj.spread !== undefined && oddsObj.spread !== null) {
                rawSpread = Math.abs(parseFloat(oddsObj.spread));
            }

            if (oddsObj.details) {
                const parts = oddsObj.details.split(" ");
                const favAbbr = parts[0];

                if (homeCompetitor.team.abbreviation === favAbbr || homeCompetitor.team.shortDisplayName === favAbbr || homeCompetitor.team.name === favAbbr) {
                    favoriteTeamSchool = homeTeamSchool;
                    favoriteTeamId = homeTeamId;
                } else if (awayCompetitor.team.abbreviation === favAbbr || awayCompetitor.team.shortDisplayName === favAbbr || awayCompetitor.team.name === favAbbr) {
                    favoriteTeamSchool = awayTeamSchool;
                    favoriteTeamId = awayTeamId;
                }
            }
        }

        let homeSpreadOdds = -110;
        let awaySpreadOdds = -110;

        const ps = oddsObj?.pointSpread;
        if (ps) {
            if (ps.home) {
                const hOdds = parseInt(ps.home.close?.odds ?? ps.home.open?.odds ?? -110, 10);
                if (!isNaN(hOdds)) homeSpreadOdds = hOdds;
            }
            if (ps.away) {
                const aOdds = parseInt(ps.away.close?.odds ?? ps.away.open?.odds ?? -110, 10);
                if (!isNaN(aOdds)) awaySpreadOdds = aOdds;
            }
        }

        let overUnder = oddsObj?.overUnder !== undefined && oddsObj?.overUnder !== null ? parseFloat(oddsObj.overUnder) : 0.0;
        let finalSpread = rawSpread !== null ? -Math.abs(rawSpread) : null;
        let computedAdj = rawSpread !== null ? applyHookRule(rawSpread, favoriteTeamId === homeTeamId ? homeSpreadOdds : awaySpreadOdds) : null;
        let adjustedSpread = computedAdj !== null ? -Math.abs(computedAdj) : null;

        const homeScore = homeCompetitor.score !== undefined ? parseInt(homeCompetitor.score, 10) : null;
        const awayScore = awayCompetitor.score !== undefined ? parseInt(awayCompetitor.score, 10) : null;
        const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
        const liveStatus = comp.status?.type?.shortDetail;

        let lockedSpread = finalSpread;
        let lockedAdjustedSpread = adjustedSpread;
        let lockedFavorite = favoriteTeamSchool;
        let lockedFavoriteId = favoriteTeamId;
        let lockedOverUnder = overUnder;
        let lockedSpreadOdds = homeSpreadOdds;
        let lockedAwaySpreadOdds = awaySpreadOdds;

        if (existingGame) {
            const kickoffTime = existingGame.game_date ? new Date(existingGame.game_date).getTime() : new Date(gameDate).getTime();
            const now = Date.now();
            const hoursUntilKickoff = (kickoffTime - now) / (1000 * 60 * 60);

            const isAlreadyFinal = existingGame.status === "STATUS_FINAL" || existingGame.status === "Final" || existingGame.status === "completed";

            if ((hoursUntilKickoff <= 48 && !isAlreadyFinal) || isAlreadyFinal) {
                lockedSpread = existingGame.spread !== null ? existingGame.spread : finalSpread;
                lockedAdjustedSpread = existingGame.adjusted_spread !== null ? existingGame.adjusted_spread : adjustedSpread;
                lockedFavorite = existingGame.favorite || favoriteTeamSchool;
                lockedFavoriteId = existingGame.favorite_id || favoriteTeamId;
                lockedOverUnder = existingGame.over_under !== null ? existingGame.over_under : overUnder;
                lockedSpreadOdds = existingGame.spread_odds !== null ? existingGame.spread_odds : homeSpreadOdds;
                lockedAwaySpreadOdds = existingGame.away_spread_odds !== null ? existingGame.away_spread_odds : awaySpreadOdds;
            }
        }

        const isFinal = statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed" || (liveStatus && liveStatus.toLowerCase().includes("final"));

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null, ats_winner: null, ou_result: null };
        if (isFinal && homeScore !== null && awayScore !== null) {
            calculatedOutcomes = calculateGameOutcomes({
                home_team_id: homeTeamId,
                home_team: homeTeamSchool,
                away_team_id: awayTeamId,
                away_team: awayTeamSchool,
                spread: lockedSpread,
                adjusted_spread: lockedAdjustedSpread,
                favorite_id: lockedFavoriteId,
                favorite: lockedFavorite,
                over_under: lockedOverUnder
            }, homeScore, awayScore);
        }

        const getTeamRank = (teamObj) => {
            if (!teamObj || !teamObj.id) return null;
            return rankingsMap[String(teamObj.id)] || null;
        };

        const homeTeamRank = getTeamRank(homeCompetitor.team);
        const awayTeamRank = getTeamRank(awayCompetitor.team);

        matchups.push({
            id: gameId,
            week: weekNum,
            home_team_id: homeTeamId,
            home_team: homeTeamSchool,
            home_team_nickname: homeTeamMascot,
            home_team_conference: getConferenceName(homeConfId),
            home_team_rank: homeTeamRank,
            away_team_id: awayTeamId,
            away_team: awayTeamSchool,
            away_team_nickname: awayTeamMascot,
            away_team_conference: getConferenceName(awayConfId),
            away_team_rank: awayTeamRank,
            home_logo: homeCompetitor.team.logo || null,
            away_logo: awayCompetitor.team.logo || null,
            home_color: homeColor,
            home_secondary_color: homeSecondaryColor,
            away_color: awayColor,
            away_secondary_color: awaySecondaryColor,
            spread: lockedSpread,
            spread_odds: lockedSpreadOdds,
            away_spread_odds: lockedAwaySpreadOdds,
            adjusted_spread: lockedAdjustedSpread,
            over_under: lockedOverUnder,
            favorite_id: lockedFavoriteId,
            favorite: lockedFavorite,
            game_date: gameDate,
            status: statusType,
            live_status: liveStatus,
            ...calculatedOutcomes
        });
    }

    return matchups;
}

function calculateGameOutcomes(m, homeScore, awayScore) {
    if (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null) {
        return { home_score: null, away_score: null, winner: null, ats_winner: null, ou_result: null };
    }

    let winner = "PUSH";
    if (homeScore > awayScore) winner = m.home_team;
    else if (awayScore > homeScore) winner = m.away_team;

    const rawSpread = m.adjusted_spread !== undefined && m.adjusted_spread !== null ? m.adjusted_spread : m.spread;
    let ats_winner = "PUSH";

    if (rawSpread !== null && rawSpread !== undefined) {
        const spreadVal = Math.abs(Number(rawSpread));
        const favTeam = m.favorite;
        const isHomeFav = favTeam === m.home_team;
        const dogTeam = isHomeFav ? m.away_team : m.home_team;

        const favScore = isHomeFav ? homeScore : awayScore;
        const dogScore = isHomeFav ? awayScore : homeScore;

        const actualMargin = favScore - dogScore;

        if (actualMargin > spreadVal) {
            ats_winner = favTeam;
        } else {
            ats_winner = dogTeam;
        }
    }

    let ou_result = "PUSH";
    if (m.over_under) {
        const totalPoints = homeScore + awayScore;
        if (totalPoints > m.over_under) ou_result = "OVER";
        else if (totalPoints < m.over_under) ou_result = "UNDER";
        else ou_result = "PUSH";
    }

    return { home_score: homeScore, away_score: awayScore, winner, ats_winner, ou_result };
}

async function processMatchup(m) {
    const { NcaabRegularSeasonGames } = db;
    try {
        const existingGame = await NcaabRegularSeasonGames.findOne({
            where: { id: m.id }
        });

        if (!existingGame) {
            await NcaabRegularSeasonGames.create(m);
        } else {
            await existingGame.update(m);
        }
    } catch (err) {
        console.error(`[NCAAB Sync] Error saving matchup Week ${m.week} (${m.away_team} @ ${m.home_team}):`, err.message);
    }
}

async function syncNcaabSeason(targetWeek) {
    try {
        const weekObj = NCAAB_WEEKS.find(w => w.week === targetWeek);
        if (!weekObj) return;

        const monday = new Date(weekObj.start);

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const datesToQuery = [
            formatDateToYYYYMMDD(friday),
            formatDateToYYYYMMDD(saturday),
            formatDateToYYYYMMDD(sunday)
        ];

        let allEvents = [];

        for (const dateStr of datesToQuery) {
            const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${dateStr}&groups=50&limit=500`;
            console.log(`[NCAAB Regular Season sync] Fetching Week ${targetWeek} data for date ${dateStr}`);

            try {
                const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });
                if (data?.events) {
                    allEvents.push(...data.events);
                }
            } catch (innerErr) {
                console.log(`[NCAAB Sync] Notice: Could not fetch scoreboard for date ${dateStr}:`, innerErr.message);
            }
        }

        const matchups = await extractMatchups(allEvents, targetWeek);
        for (const m of matchups) {
            await processMatchup(m);
        }
        console.log(`[NCAAB Regular Season sync] Successfully synced ${matchups.length} matchups for Week ${targetWeek}.`);

    } catch (err) {
        console.error(`[NCAAB Regular Season sync] Fatal Error on Week ${targetWeek}:`, err.response?.status, err.response?.data || err.message);
    }
}

/**
 * 🧠 MAIN EXPORTED WRAPPER: Automatically syncs the rolling 3-week window (Current, Next, and Following Week)
 */
async function syncNcaabSeasonMain() {
    const currentWeek = getCurrentNcaabWeek();

    const targetWeeks = [currentWeek, currentWeek + 1, currentWeek + 2];

    console.log(`[NCAAB Sync Job] Current Active Week: Week ${currentWeek} | Syncing Weeks: ${targetWeeks.join(", ")}`);

    for (const wk of targetWeeks) {
        if (wk <= NCAAB_WEEKS.length) {
            await syncNcaabSeason(wk);
        }
    }
}

module.exports = syncNcaabSeasonMain;