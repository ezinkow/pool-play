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
    const { CfbRegularSeasonGames } = db;

    for (const event of data.events) {
        const seasonType = event.season?.type;
        if (seasonType !== 2) continue;
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const gameId = event.id; // ESPN Game ID used as PK
        const gameDate = event.date;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) continue;

        const homeConfId = String(homeCompetitor.team?.conferenceId || "");
        const awayConfId = String(awayCompetitor.team?.conferenceId || "");
        const isPower4Game = validConferenceIds.includes(homeConfId) || validConferenceIds.includes(awayConfId);

        if (!isPower4Game) continue;

        // --- CORE IDENTIFIERS & COLORS ---
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
        // ---------------------------------

        const existingGame = await CfbRegularSeasonGames.findOne({
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
        let finalSpread = rawSpread !== null ? -rawSpread : null;
        let adjustedSpread = applyHookRule(rawSpread, homeSpreadOdds);

        const homeScore = homeCompetitor.score !== undefined ? parseInt(homeCompetitor.score, 10) : null;
        const awayScore = awayCompetitor.score !== undefined ? parseInt(awayCompetitor.score, 10) : null;
        const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";

        const isFinal = statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed";

        if ((isFinal || finalSpread === null) && existingGame) {
            if (finalSpread === null) {
                finalSpread = existingGame.spread;
                adjustedSpread = existingGame.adjusted_spread;
                homeSpreadOdds = existingGame.spread_odds ?? homeSpreadOdds;
                awaySpreadOdds = existingGame.away_spread_odds ?? awaySpreadOdds;
                overUnder = existingGame.over_under || overUnder;
                favoriteTeamSchool = existingGame.favorite || favoriteTeamSchool;
                favoriteTeamId = existingGame.favorite_id || favoriteTeamId;
            }
        }

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null, ats_winner: null, ou_result: null };
        if (isFinal) {
            calculatedOutcomes = calculateGameOutcomes({
                home_team_id: homeTeamId,
                home_team: homeTeamSchool,
                away_team_id: awayTeamId,
                away_team: awayTeamSchool,
                spread: finalSpread,
                adjusted_spread: adjustedSpread,
                favorite_id: favoriteTeamId,
                favorite: favoriteTeamSchool,
                over_under: overUnder
            }, homeScore, awayScore);
        }

        const getTeamRank = (teamObj) => {
            if (!teamObj || !teamObj.id) return null;
            return rankingsMap[String(teamObj.id)] || null;
        };

        const homeTeamRank = getTeamRank(homeCompetitor.team);
        const awayTeamRank = getTeamRank(awayCompetitor.team);

        matchups.push({
            id: gameId, // Set ESPN game ID as primary key
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
            spread: finalSpread,
            spread_odds: homeSpreadOdds,
            away_spread_odds: awaySpreadOdds,
            adjusted_spread: adjustedSpread,
            over_under: overUnder,
            favorite_id: favoriteTeamId,
            favorite: favoriteTeamSchool,
            game_date: gameDate,
            status: statusType,
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

    const spreadVal = m.adjusted_spread !== undefined ? m.adjusted_spread : m.spread;
    let ats_winner = "PUSH";

    if (spreadVal !== null && spreadVal !== undefined) {
        const isHomeFav = m.favorite_id === m.home_team_id;
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
        const existingGame = await CfbRegularSeasonGames.findOne({
            where: { id: m.id }
        });

        if (!existingGame) {
            await CfbRegularSeasonGames.create(m);
        } else {
            let payloadToUpdate = { ...m };

            if ((payloadToUpdate.spread === null || payloadToUpdate.spread === undefined) && existingGame.spread != null) {
                payloadToUpdate.spread = existingGame.spread;
                payloadToUpdate.adjusted_spread = existingGame.adjusted_spread;
                payloadToUpdate.spread_odds = existingGame.spread_odds;
                payloadToUpdate.away_spread_odds = existingGame.away_spread_odds;
                payloadToUpdate.over_under = existingGame.over_under;
                payloadToUpdate.favorite = existingGame.favorite;
                payloadToUpdate.favorite_id = existingGame.favorite_id;
            }

            if (existingGame.game_date) {
                const kickoffTime = new Date(existingGame.game_date).getTime();
                const now = Date.now();
                const hoursUntilKickoff = (kickoffTime - now) / (1000 * 60 * 60);

                if (hoursUntilKickoff <= 48) {
                    payloadToUpdate.spread = existingGame.spread;
                    payloadToUpdate.adjusted_spread = existingGame.adjusted_spread;
                    payloadToUpdate.spread_odds = existingGame.spread_odds;
                    payloadToUpdate.away_spread_odds = existingGame.away_spread_odds;
                    payloadToUpdate.over_under = existingGame.over_under;
                    payloadToUpdate.favorite = existingGame.favorite;
                    payloadToUpdate.favorite_id = existingGame.favorite_id;
                }
            }

            await existingGame.update(payloadToUpdate);
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