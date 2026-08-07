const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 DYNAMIC SATURDAY-TO-FRIDAY CFB WEEKLY WINDOW CALCULATOR
 * Week 1: August 22, 2026 – September 7, 2026
 * Subsequent Weeks: Saturday to Friday rolling window
 */
function getCfbDateRange(weekNumber) {
    if (weekNumber === 1 || !weekNumber) {
        return "20260822-20260907";
    }

    const baseSaturday = new Date("2026-09-08T00:00:00");
    const weekStart = new Date(baseSaturday);
    weekStart.setDate(baseSaturday.getDate() + (weekNumber - 2) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    return `${formatDate(weekStart)}-${formatDate(weekEnd)}`;
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
 * 🧠 FETCH TEAM RANKINGS FROM ESPN CORE API BY WEEK
 * Dereferences team $ref and maps using the team's unique ESPN $ref ID (extracted directly from the URL string).
 */
async function fetchTeamRankings(weekNumber) {
    const rankingsMap = {};
    try {
        const rankingsUrl = `http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/types/1/weeks/${weekNumber}/rankings/2?lang=en&region=us`;
        const { data } = await axios.get(rankingsUrl, { timeout: 10000 });
        const ranksArray = data?.ranks || [];

        ranksArray.forEach(item => {
            const currentRank = item.current;
            const teamRef = item.team?.$ref;

            if (currentRank && teamRef) {
                // Extract unique team ID from the end of the $ref URL (e.g., ".../teams/61?...")
                const match = teamRef.match(/\/teams\/(\d+)\?/);
                if (match && match[1]) {
                    const teamId = match[1];
                    rankingsMap[teamId] = parseInt(currentRank, 10);
                }
            }
        });
    } catch (err) {
        console.log(`[CFB Sync] Rankings endpoint for Week ${weekNumber} not active or returned error.`);
    }
    return rankingsMap;
}

async function extractMatchups(data, weekNum) {
    if (!data?.events) return [];
    const matchups = [];
    const validConferenceIds = ["1", "4", "5", "8"]; // ACC, Big 12, Big Ten, SEC

    const POWER_FOUR_CONFERENCES = {
        "1": "ACC",
        "4": "Big 12",
        "5": "Big Ten",
        "8": "SEC"
    };

    function getConferenceName(confId) {
        return POWER_FOUR_CONFERENCES[String(confId)] || "Other";
    }

    const rankingsMap = await fetchTeamRankings(weekNum);

    data.events.forEach(event => {
        const seasonType = event.season?.type;
        if (seasonType !== 2) return;
        const comp = event.competitions?.[0];
        if (!comp) return;

        const gameDate = event.date;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) return;

        const homeConfId = String(homeCompetitor.team?.conferenceId || "");
        const awayConfId = String(awayCompetitor.team?.conferenceId || "");
        const isPower4Game = validConferenceIds.includes(homeConfId) || validConferenceIds.includes(awayConfId);

        if (!isPower4Game) return;

        let rawSpread = 3.0;
        let favoriteTeamName = homeCompetitor.team.name;

        const oddsObj = Array.isArray(comp.odds) ? comp.odds[0] : comp.odds;

        if (oddsObj) {
            if (oddsObj.spread !== undefined) {
                rawSpread = Math.abs(parseFloat(oddsObj.spread));
            }

            if (oddsObj.details) {
                const parts = oddsObj.details.split(" ");
                const favAbbr = parts[0];

                if (homeCompetitor.team.abbreviation === favAbbr || homeCompetitor.team.shortDisplayName === favAbbr) {
                    favoriteTeamName = homeCompetitor.team.name;
                } else if (awayCompetitor.team.abbreviation === favAbbr || awayCompetitor.team.shortDisplayName === favAbbr) {
                    favoriteTeamName = awayCompetitor.team.name;
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

        const overUnder = oddsObj?.overUnder !== undefined ? parseFloat(oddsObj.overUnder) : 0.0;
        const finalSpread = -rawSpread;
        const adjustedSpread = applyHookRule(rawSpread, homeSpreadOdds);

        const homeScore = homeCompetitor.score !== undefined ? parseInt(homeCompetitor.score, 10) : null;
        const awayScore = awayCompetitor.score !== undefined ? parseInt(awayCompetitor.score, 10) : null;
        const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null, ats_winner: null, ou_result: null };
        if (statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed") {
            calculatedOutcomes = calculateGameOutcomes({ home_team: homeCompetitor.team.name, away_team: awayCompetitor.team.name, spread: finalSpread, adjusted_spread: adjustedSpread, favorite: favoriteTeamName, over_under: overUnder }, homeScore, awayScore);
        }

        // Match rank by exact team id directly available on competitor.team.id
        const getTeamRank = (teamObj) => {
            if (!teamObj || !teamObj.id) return null;
            return rankingsMap[String(teamObj.id)] || null;
        };

        const homeTeamRank = getTeamRank(homeCompetitor.team);
        const awayTeamRank = getTeamRank(awayCompetitor.team);

        let homeColor = homeCompetitor.team.color ? `#${homeCompetitor.team.color}` : "#013369";
        let homeSecondaryColor = homeCompetitor.team.alternateColor ? `#${homeCompetitor.team.alternateColor}` : homeColor;
        if (homeCompetitor.team.shortDisplayName === "West Virginia" || homeCompetitor.team.name === "West Virginia Mountaineers") {
            const temp = homeColor;
            homeColor = homeSecondaryColor;
            homeSecondaryColor = temp;
        }

        let awayColor = awayCompetitor.team.color ? `#${awayCompetitor.team.color}` : "#013369";
        let awaySecondaryColor = awayCompetitor.team.alternateColor ? `#${awayCompetitor.team.alternateColor}` : awayColor;
        if (awayCompetitor.team.shortDisplayName === "West Virginia" || awayCompetitor.team.name === "West Virginia Mountaineers") {
            const temp = awayColor;
            awayColor = awaySecondaryColor;
            awaySecondaryColor = temp;
        }

        matchups.push({
            week: weekNum,
            home_team: homeCompetitor.team.name,
            home_team_nickname: homeCompetitor.team.shortDisplayName,
            home_team_conference: getConferenceName(homeConfId),
            home_team_rank: homeTeamRank,
            away_team: awayCompetitor.team.name,
            away_team_nickname: awayCompetitor.team.shortDisplayName,
            away_team_conference: getConferenceName(awayConfId),
            away_team_rank: awayTeamRank,
            home_logo: homeCompetitor.team.logo || null,
            away_logo: awayCompetitor.team.logo || null,
            home_color: homeColor,
            home_secondary_color: homeSecondaryColor,
            away_color: awayColor,
            away_secondary_color: awaySecondaryColor,
            spread: finalSpread,
            spread_odds: homeSpreadOdds,
            away_spread_odds: awaySpreadOdds,
            adjusted_spread: adjustedSpread,
            over_under: overUnder,
            favorite: favoriteTeamName,
            game_date: gameDate,
            status: statusType,
            ...calculatedOutcomes
        });
    });

    return matchups;
}

function calculateGameOutcomes(m, homeScore, awayScore) {
    if (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null) {
        return { home_score: null, away_score: null, winner: null, ats_winner: null, ou_result: null };
    }

    let winner = "PUSH";
    if (homeScore > awayScore) winner = m.home_team;
    else if (awayScore > homeScore) winner = m.away_team;

    const spreadVal = m.adjusted_spread !== undefined ? m.adjusted_spread : m.spread;
    let ats_winner = "PUSH";

    if (spreadVal !== null && spreadVal !== undefined) {
        const isHomeFav = m.favorite === m.home_team;
        const favScore = isHomeFav ? homeScore : awayScore;
        const dogScore = isHomeFav ? awayScore : homeScore;
        const favTeam = isHomeFav ? m.home_team : m.away_team;
        const dogTeam = isHomeFav ? m.away_team : m.home_team;

        const margin = favScore + spreadVal;
        if (margin > dogScore) ats_winner = favTeam;
        else if (margin < dogScore) ats_winner = dogTeam;
        else ats_winner = "PUSH";
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
    const { CfbRegularSeasonGames } = db;
    try {
        const [game, created] = await CfbRegularSeasonGames.findOrCreate({
            where: { week: m.week, home_team: m.home_team, away_team: m.away_team },
            defaults: m
        });

        if (!created) {
            await game.update(m);
        }
    } catch (err) {
        console.error(`[CFB Sync] Error saving matchup Week ${m.week} (${m.away_team} @ ${m.home_team}):`, err.message);
    }
}

async function syncCfbSeason(targetWeek = 1) {
    try {
        const dateRange = getCfbDateRange(targetWeek);
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${dateRange}`;

        console.log(`[CFB Regular Season sync] Fetching Week ${targetWeek} data for range: ${dateRange}`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const matchups = await extractMatchups(data, targetWeek);
        for (const m of matchups) {
            await processMatchup(m);
        }
        console.log(`[CFB Regular Season sync] Successfully synced ${matchups.length} matchups for Week ${targetWeek}.`);

    } catch (err) {
        console.error(`[CFB Regular Season sync] Fatal Error on Week ${targetWeek}:`, err.message);
    }
}

module.exports = syncCfbSeason;