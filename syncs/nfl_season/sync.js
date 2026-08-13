const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 DYNAMIC DATE CALCULATOR (Wednesday to Tuesday NFL Windows)
 * Automatically generates the ESPN scoreboard date range string for the current week and next week.
 */
function getDynamicDateRange() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday, etc.

    // Calculate days to the most recent Wednesday
    let distanceToWednesday = (dayOfWeek >= 3) ? (dayOfWeek - 3) : (dayOfWeek + 4);

    const currentWednesday = new Date(now);
    currentWednesday.setDate(now.getDate() - distanceToWednesday);

    // We want a 2-week window ending 14 days later (covering this week + next week)
    const twoWeeksOut = new Date(currentWednesday);
    twoWeeksOut.setDate(currentWednesday.getDate() + 14); // 14 days covers 2 full weeks

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    return `${formatDate(currentWednesday)}-${formatDate(twoWeeksOut)}`;
}

/**
 * 🧠 UNIVERSAL HOOK RULE LOGIC:
 * Automatically detects any whole number spread (e.g., 3.0, 6.0, 7.0) 
 * and bumps it to a half-point (e.g., 3.5, 6.5, 7.5) if the juice condition is met.
 * Natural half-points (e.g., 2.5, 5.5) pass through untouched.
 */
function applyHookRule(spread, odds) {
    if (spread === null || spread === undefined) return spread;

    let absVal = Math.abs(spread);
    let adjustedAbs = absVal;

    // Check if the number is a whole number (e.g., 3.0, 6.0, 10.0)
    const isWholeNumber = Number.isInteger(absVal);
    if (isWholeNumber) {
        // If it's a whole number and juice meets your threshold, bump by 0.5
        if (odds !== null && odds !== undefined && odds >= -110) {
            adjustedAbs = absVal - 0.5;
        } else {
            adjustedAbs = absVal + 0.5;
        }
    }
    // Always return as a negative number for the favorite's adjusted spread
    return -adjustedAbs;
}

function extractMatchups(data) {
    if (!data?.events) return [];
    const matchups = [];

    data.events.forEach(event => {
        // 🧠 CONDITION: Only look for regular season games (season.type === 2)
        const seasonType = event.season?.type;
        if (seasonType !== 2) {
            return; // Skip preseason (1), postseason (3), etc.
        }
        const comp = event.competitions?.[0];
        if (!comp) return;

        const weekNum = event.week?.number || 1;
        const gameDate = event.date;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) return;

        let rawSpread = '';
        let favoriteTeamName = homeCompetitor.team.name;

        // 🧠 Pull the odds object cleanly from the array or object
        const oddsObj = Array.isArray(comp.odds) ? comp.odds[0] : comp.odds;

        if (oddsObj) {
            // 1. Get spread magnitude from oddsObj.spread (e.g., -2.5 becomes 2.5)
            if (oddsObj.spread !== undefined) {
                rawSpread = Math.abs(parseFloat(oddsObj.spread));
            }

            // 🧠 Parse Favorite directly from ESPN details string
            if (oddsObj.details) {
                const parts = oddsObj.details.split(" ");
                const favAbbr = parts[0];

                // Match the abbreviation to home or away team object
                if (homeCompetitor.team.abbreviation === favAbbr || homeCompetitor.team.shortDisplayName === favAbbr) {
                    favoriteTeamName = homeCompetitor.team.name;
                } else if (awayCompetitor.team.abbreviation === favAbbr || awayCompetitor.team.shortDisplayName === favAbbr) {
                    favoriteTeamName = awayCompetitor.team.name;
                }
            }
        }

        // 2. Extract precise close odds for both home and away independently
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

        // Extract scores if status indicates completion
        const homeScore = homeCompetitor.score !== undefined ? parseInt(homeCompetitor.score, 10) : null;
        const awayScore = awayCompetitor.score !== undefined ? parseInt(awayCompetitor.score, 10) : null;
        const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null, ats_winner: null, ou_result: null };
        if (statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed") {
            calculatedOutcomes = calculateGameOutcomes({ home_team: homeCompetitor.team.name, away_team: awayCompetitor.team.name, spread: finalSpread, adjusted_spread: adjustedSpread, favorite: favoriteTeamName, over_under: overUnder }, homeScore, awayScore);
        }

        matchups.push({
            week: weekNum,
            home_team: homeCompetitor.team.name,
            away_team: awayCompetitor.team.name,
            home_logo: homeCompetitor.team.logo || null,
            away_logo: awayCompetitor.team.logo || null,
            home_color: homeCompetitor.team.color ? `#${homeCompetitor.team.color}` : null,
            away_color: awayCompetitor.team.color ? `#${awayCompetitor.team.color}` : null,
            spread: finalSpread,
            spread_odds: homeSpreadOdds,      // Home juice
            away_spread_odds: awaySpreadOdds, // Away juice
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

    // 1. Outright Winner
    let winner = "PUSH";
    if (homeScore > awayScore) winner = m.home_team;
    else if (awayScore > homeScore) winner = m.away_team;

    // 2. ATS Cover Calculation (using adjusted_spread or spread, relative to favorite)
    const spreadVal = m.adjusted_spread !== undefined ? m.adjusted_spread : m.spread;
    let ats_winner = "PUSH";

    if (spreadVal !== null && spreadVal !== undefined) {
        const isHomeFav = m.favorite === m.home_team;
        const favScore = isHomeFav ? homeScore : awayScore;
        const dogScore = isHomeFav ? awayScore : homeScore;
        const favTeam = isHomeFav ? m.home_team : m.away_team;
        const dogTeam = isHomeFav ? m.away_team : m.home_team;

        const margin = favScore + spreadVal;
        if (margin > dogScore) {
            ats_winner = favTeam;
        } else if (margin < dogScore) {
            ats_winner = dogTeam;
        } else {
            ats_winner = "PUSH";
        }
    }

    // 3. Over / Under Result
    let ou_result = "PUSH";
    if (m.over_under) {
        const totalPoints = homeScore + awayScore;
        if (totalPoints > m.over_under) ou_result = "OVER";
        else if (totalPoints < m.over_under) ou_result = "UNDER";
        else ou_result = "PUSH";
    }

    return {
        home_score: homeScore,
        away_score: awayScore,
        winner,
        ats_winner,
        ou_result
    };
}

/**
 * 🧠 AUTOMATED SURVIVOR ELIMINATION EVALUATOR
 * Automatically evaluates user picks against finalized game winners and updates entry statuses.
 */
async function evaluateSurvivorResults() {
    const { NflSurvivorEntries, NflSurvivorPicks, NflRegularSeasonGames } = db;
    try {
        const completedGames = await NflRegularSeasonGames.findAll({
            where: {
                status: ["STATUS_FINAL", "Final", "completed", "FINAL"]
            }
        });

        if (!completedGames || completedGames.length === 0) return;

        const gameWinners = {};
        completedGames.forEach(game => {
            if (!game.week) return;
            if (!gameWinners[game.week]) {
                gameWinners[game.week] = {};
            }
            if (game.winner) {
                gameWinners[game.week][game.away_team] = (game.winner === game.away_team ? "WIN" : (game.winner === "PUSH" ? "PUSH" : "LOSS"));
                gameWinners[game.week][game.home_team] = (game.winner === game.home_team ? "WIN" : (game.winner === "PUSH" ? "PUSH" : "LOSS"));
            }
        });

        const entries = await NflSurvivorEntries.findAll();
        const allPicks = await NflSurvivorPicks.findAll();

        const picksByUserAndWeek = {};
        allPicks.forEach(p => {
            if (!picksByUserAndWeek[p.user_id]) {
                picksByUserAndWeek[p.user_id] = {};
            }
            picksByUserAndWeek[p.user_id][p.week] = p;
        });

        for (const entry of entries) {
            let isEliminated = false;
            let eliminatedWeek = null;
            const userPicks = picksByUserAndWeek[entry.user_id] || {};

            const weeksPlayed = Object.keys(userPicks).map(Number).sort((a, b) => a - b);

            for (const wk of weeksPlayed) {
                const pick = userPicks[wk];
                const weekResults = gameWinners[wk];

                if (pick && weekResults && weekResults[pick.team_name]) {
                    const outcome = weekResults[pick.team_name]; // "WIN", "LOSS", or "PUSH"

                    pick.status = outcome.toLowerCase();
                    await pick.save();

                    if (outcome === "LOSS") {
                        isEliminated = true;
                        eliminatedWeek = wk;
                        break;
                    }
                }
            }

            entry.is_eliminated = isEliminated;
            entry.eliminated_week = eliminatedWeek;
            await entry.save();
        }

        console.log("[NFL Survivor] Automated eliminations evaluated successfully.");
    } catch (err) {
        console.error("[NFL Survivor] Error evaluating automated survivor outcomes:", err);
    }
}

async function processMatchup(m) {
    const { NflRegularSeasonGames } = db;
    try {
        const [game, created] = await NflRegularSeasonGames.findOrCreate({
            where: { week: m.week, home_team: m.home_team, away_team: m.away_team },
            defaults: m
        });

        if (!created) {
            await game.update(m);
        }
    } catch (err) {
        console.error(`[NFL BTS sync] Error saving matchup Week ${m.week} (${m.away_team} @ ${m.home_team}):`, err.message);
    }
}

async function syncNflSeason() {
    try {
        const now = new Date();
        const seasonStartThreshold = new Date("2026-09-09T00:00:00"); // Week 1 kickoff date

        // Hardcode through 9/22 until season starts, then switch to dynamic 2-week rolling window
        const dateRange = now < seasonStartThreshold ? "20260909-20260922" : getDynamicDateRange();
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${dateRange}`;

        console.log(`[NFL Regular Season sync] Fetching scoreboard data for range: ${dateRange}`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const matchups = extractMatchups(data);
        for (const m of matchups) {
            await processMatchup(m);
        }
        console.log(`[NFL Regular Season sync] Successfully synced ${matchups.length} matchups.`);

        // 🧠 Automatically run survivor elimination evaluation after games sync
        await evaluateSurvivorResults();

    } catch (err) {
        console.error("[NFL Regular Season sync] Fatal Error:", err.message);
    }
}

module.exports = syncNflSeason;