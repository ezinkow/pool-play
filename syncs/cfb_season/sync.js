const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 DYNAMIC SATURDAY-TO-FRIDAY CFB WEEKLY WINDOW CALCULATOR
 * Week 1: August 22, 2026 – September 7, 2026
 * Subsequent Weeks: Saturday to Friday rolling window
 */
function getCfbDateRange(weekNumber) {
    // Week 1 custom range override
    if (weekNumber === 1 || !weekNumber) {
        return "20260822-20260907";
    }

    // Week 2 starts on Saturday, September 8, 2026 (or adjust base opening Saturday)
    const baseSaturday = new Date("2026-09-08T00:00:00");

    // Add 7 days per week past Week 1
    const weekStart = new Date(baseSaturday);
    weekStart.setDate(baseSaturday.getDate() + (weekNumber - 2) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Friday of that week

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    return `${formatDate(weekStart)}-${formatDate(weekEnd)}`;
}

/**
 * 🧠 UNIVERSAL HOOK RULE LOGIC:
 */
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
 * 🧠 FETCH TEAM RANKINGS FROM ESPN CORE API
 * Designed to pull and map team rankings when the endpoint becomes active.
 */
async function fetchTeamRankings() {
    const rankingsMap = {};
    try {
        const rankingsUrl = "http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/rankings?lang=en&region=us";
        const { data } = await axios.get(rankingsUrl, { timeout: 10000 });

        // Defensive parsing depending on ESPN's core API structure layout for rankings
        // Typically contains a list/ranks array mapping team IDs or names to current rank numbers
        const rankingRanks = data?.ranks || data?.items || [];
        rankingRanks.forEach(item => {
            const teamName = item.team?.name || item.name;
            const rank = item.current || item.rank;
            if (teamName && rank) {
                rankingsMap[teamName] = parseInt(rank, 10);
            }
        });
    } catch (err) {
        // Safe fallback since the endpoint is not yet configured/populated
        console.log("[CFB Sync] Rankings endpoint not yet active or returned empty. Defaulting ranks to null.");
    }
    return rankingsMap;
}

async function extractMatchups(data) {
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

    // Fetch rankings map asynchronously to inject into matchups
    const rankingsMap = await fetchTeamRankings();

    data.events.forEach(event => {
        const seasonType = event.season?.type;
        if (seasonType !== 2) {
            return;
        }
        const comp = event.competitions?.[0];
        if (!comp) return;

        const weekNum = event.week?.number || 1;
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

        // Map team ranks from rankings map (defaults to null if unranked/unavailable)
        const homeTeamRank = rankingsMap[homeCompetitor.team.name] || null;
        const awayTeamRank = rankingsMap[awayCompetitor.team.name] || null;

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
            home_color: homeCompetitor.team.color ? `#${homeCompetitor.team.color}` : null,
            home_secondary_color: homeCompetitor.team.color ? `#${homeCompetitor.team.alternateColor}` : null,
            away_color: awayCompetitor.team.color ? `#${awayCompetitor.team.color}` : null,
            away_secondary_color: awayCompetitor.team.color ? `#${awayCompetitor.team.alternateColor}` : null,
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

/**
 * Syncs a specific week or defaults to Week 1
 */
async function syncCfbSeason(targetWeek = 1) {
    try {
        const dateRange = getCfbDateRange(targetWeek);
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${dateRange}`;

        console.log(`[CFB Regular Season sync] Fetching Week ${targetWeek} data for range: ${dateRange}`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const matchups = await extractMatchups(data);
        for (const m of matchups) {
            await processMatchup(m);
        }
        console.log(`[CFB Regular Season sync] Successfully synced ${matchups.length} matchups for Week ${targetWeek}.`);

    } catch (err) {
        console.error(`[CFB Regular Season sync] Fatal Error on Week ${targetWeek}:`, err.message);
    }
}

module.exports = syncCfbSeason;