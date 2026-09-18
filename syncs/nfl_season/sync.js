const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 DYNAMIC CURRENT & NEXT NFL WEEK CALCULATOR
 * Maps date boundaries to determine the current active week and upcoming weeks.
 */
function getCurrentAndNextNflWeeks() {
    const now = new Date();

    const weeks = [
        { week: 1, start: new Date("2026-09-09T00:00:00"), end: new Date("2026-09-15T23:59:59") },
        { week: 2, start: new Date("2026-09-16T00:00:00"), end: new Date("2026-09-22T23:59:59") },
        { week: 3, start: new Date("2026-09-23T00:00:00"), end: new Date("2026-09-29T23:59:59") },
        { week: 4, start: new Date("2026-09-30T00:00:00"), end: new Date("2026-10-06T23:59:59") },
        { week: 5, start: new Date("2026-10-07T00:00:00"), end: new Date("2026-10-13T23:59:59") },
        { week: 6, start: new Date("2026-10-14T00:00:00"), end: new Date("2026-10-20T23:59:59") },
        { week: 8, start: new Date("2026-10-21T00:00:00"), end: new Date("2026-10-27T23:59:59") },
        { week: 9, start: new Date("2026-10-28T00:00:00"), end: new Date("2026-11-03T23:59:59") },
        { week: 10, start: new Date("2026-11-04T00:00:00"), end: new Date("2026-11-10T23:59:59") },
        { week: 11, start: new Date("2026-11-11T00:00:00"), end: new Date("2026-11-17T23:59:59") },
        { week: 12, start: new Date("2026-11-18T00:00:00"), end: new Date("2026-11-24T23:59:59") },
        { week: 13, start: new Date("2026-11-25T00:00:00"), end: new Date("2026-12-01T23:59:59") },
        { week: 14, start: new Date("2026-12-02T00:00:00"), end: new Date("2026-12-08T23:59:59") },
        { week: 15, start: new Date("2026-12-09T00:00:00"), end: new Date("2026-12-15T23:59:59") },
        { week: 16, start: new Date("2026-12-16T00:00:00"), end: new Date("2026-12-22T23:59:59") },
        { week: 17, start: new Date("2026-12-23T00:00:00"), end: new Date("2026-12-29T23:59:59") },
        { week: 18, start: new Date("2026-12-30T00:00:00"), end: new Date("2027-01-05T23:59:59") }
    ];

    let activeIndex = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
        if (now >= weeks[i].start) {
            activeIndex = i;
            break;
        }
    }
    return weeks[activeIndex].week;
}

/**
 * 🧠 UNIVERSAL HOOK RULE LOGIC:
 * Automatically detects any whole number spread (e.g., 3.0, 6.0, 7.0) 
 * and bumps it to a half-point (e.g., 3.5, 6.5, 7.5) if the juice condition is met.
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

function extractMatchups(data) {
    if (!data?.events) return [];
    const matchups = [];

    data.events.forEach(event => {
        const seasonType = event.season?.type;
        if (seasonType !== 2) {
            return;
        }
        const comp = event.competitions?.[0];
        if (!comp) return;

        const gameId = event.id;
        const weekNum = event.week?.number || 1;
        const gameDate = event.date;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) return;

        let rawSpread = '';
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
        const liveStatus = comp.status?.type?.shortDetail;

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null, ats_winner: null, ou_result: null };
        const isFinal = statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed" || statusType === "FINAL" || (liveStatus && liveStatus.toLowerCase().includes("final"));

        if (isFinal && homeScore !== null && awayScore !== null) {
            calculatedOutcomes = calculateGameOutcomes({ home_team: homeCompetitor.team.name, away_team: awayCompetitor.team.name, spread: finalSpread, adjusted_spread: adjustedSpread, favorite: favoriteTeamName, over_under: overUnder }, homeScore, awayScore);
        }

        matchups.push({
            id: gameId,
            week: weekNum,
            home_team: homeCompetitor.team.name,
            home_city: homeCompetitor.team.location,
            away_team: awayCompetitor.team.name,
            away_city: awayCompetitor.team.location,
            home_logo: homeCompetitor.team.logo || null,
            away_logo: awayCompetitor.team.logo || null,
            home_color: homeCompetitor.team.color ? `#${homeCompetitor.team.color}` : null,
            away_color: awayCompetitor.team.color ? `#${awayCompetitor.team.color}` : null,
            spread: finalSpread,
            spread_odds: homeSpreadOdds,
            away_spread_odds: awaySpreadOdds,
            adjusted_spread: adjustedSpread,
            over_under: overUnder,
            favorite: favoriteTeamName,
            game_date: gameDate,
            status: statusType,
            live_status: liveStatus,
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
        } else if (actualMargin < spreadVal) {
            ats_winner = dogTeam;
        } else {
            ats_winner = "PUSH";
        }
    }

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
                    const outcome = weekResults[pick.team_name];

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
        const existingGame = await NflRegularSeasonGames.findOne({
            where: { id: m.id }
        });

        if (!existingGame) {
            await NflRegularSeasonGames.create(m);
        } else {
            let payloadToUpdate = { ...m };

            // 🕒 48-Hour Pre-Kickoff Lock Rule:
            // If we are within 48 hours of kickoff (or the game has already started),
            // preserve the previously locked spread, odds, and favorite.
            const now = new Date();
            const gameDate = existingGame.game_date ? new Date(existingGame.game_date) : null;

            if (gameDate) {
                const hoursUntilKickoff = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                const isWithin48Hours = hoursUntilKickoff <= 48;

                if (isWithin48Hours) {
                    payloadToUpdate.spread = existingGame.spread;
                    payloadToUpdate.adjusted_spread = existingGame.adjusted_spread;
                    payloadToUpdate.spread_odds = existingGame.spread_odds;
                    payloadToUpdate.away_spread_odds = existingGame.away_spread_odds;
                    payloadToUpdate.over_under = existingGame.over_under;
                    payloadToUpdate.favorite = existingGame.favorite;
                }
            }

            payloadToUpdate.status = m.status;
            payloadToUpdate.live_status = m.live_status;
            payloadToUpdate.home_score = m.home_score;
            payloadToUpdate.away_score = m.away_score;

            const statusType = payloadToUpdate.status;
            const isFinal = statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed" || statusType === "FINAL" || (payloadToUpdate.live_status && payloadToUpdate.live_status.toLowerCase().includes("final"));

            if (isFinal && payloadToUpdate.home_score !== null && payloadToUpdate.away_score !== null) {
                const lockedSpread = existingGame.adjusted_spread !== null ? existingGame.adjusted_spread : existingGame.spread;
                const lockedFavorite = existingGame.favorite;

                const gameObjForCalc = {
                    ...payloadToUpdate,
                    spread: lockedSpread,
                    adjusted_spread: lockedSpread,
                    favorite: lockedFavorite
                };
                const calculatedOutcomes = calculateGameOutcomes(gameObjForCalc, payloadToUpdate.home_score, payloadToUpdate.away_score);
                payloadToUpdate = { ...payloadToUpdate, ...calculatedOutcomes };
            }

            await existingGame.update(payloadToUpdate);
        }
    } catch (err) {
        console.error(`[NFL BTS sync] Error saving matchup Week ${m.week} (${m.away_team} @ ${m.home_team}):`, err.message);
    }
}

async function syncNflSeason() {
    try {
        const currentWeek = getCurrentAndNextNflWeeks();

        // ✨ Target rolling 3-week window (Current Week, Next Week, and Following Week)
        const targetWeeks = [currentWeek, currentWeek + 1, currentWeek + 2];

        console.log(`[NFL Sync Job] Current Active Week: Week ${currentWeek} | Syncing Weeks: ${targetWeeks.join(", ")}`);

        for (const wk of targetWeeks) {
            const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${wk}&limit=500`;

            console.log(`[NFL Regular Season sync] Fetching scoreboard data for Week ${wk}`);
            const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

            const matchups = extractMatchups(data);
            for (const m of matchups) {
                await processMatchup(m);
            }
            console.log(`[NFL Regular Season sync] Successfully synced ${matchups.length} matchups for Week ${wk}.`);
        }

        await evaluateSurvivorResults();

    } catch (err) {
        console.error("[NFL Regular Season sync] Fatal Error:", err.response?.status, err.response?.data || err.message);
        if (err.config) {
            console.error("[NFL Regular Season sync] Requested URL was:", err.config.url);
        }
    }
}

module.exports = syncNflSeason;