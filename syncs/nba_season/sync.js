const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 DYNAMIC CURRENT & NEXT NBA WEEK CALCULATOR
 */
function getCurrentAndNextNbaWeeks() {
    const now = new Date();
    const weeks = [];

    weeks.push({
        week: 1,
        start: new Date("2026-09-18T00:00:00"),
        end: new Date("2026-10-25T23:59:59")
    });

    let currentMonday = new Date("2026-10-26T00:00:00");
    for (let w = 2; w <= 26; w++) {
        const weekStart = new Date(currentMonday);
        const weekEnd = new Date(currentMonday);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        weeks.push({
            week: w,
            start: weekStart,
            end: weekEnd
        });

        currentMonday.setDate(currentMonday.getDate() + 7);
    }

    let activeIndex = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
        if (now >= weeks[i].start) {
            activeIndex = i;
            break;
        }
    }
    return weeks[activeIndex].week;
}

function getWeekendDatesForNbaWeek(weekNumber) {
    const weekendDates = [];

    if (weekNumber === 1) {
        let curr = new Date("2026-09-18T00:00:00");
        const endRange = new Date("2026-10-25T23:59:59");

        while (curr <= endRange) {
            const dayOfWeek = curr.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                const year = curr.getFullYear();
                const month = String(curr.getMonth() + 1).padStart(2, '0');
                const day = String(curr.getDate()).padStart(2, '0');
                weekendDates.push(`${year}${month}${day}`);
            }
            curr.setDate(curr.getDate() + 1);
        }
    } else {
        const week1Start = new Date("2026-10-26T00:00:00");
        const monday = new Date(week1Start);
        monday.setDate(week1Start.getDate() + (weekNumber - 2) * 7);

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);

            const dayOfWeek = currentDay.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
                const year = currentDay.getFullYear();
                const month = String(currentDay.getMonth() + 1).padStart(2, '0');
                const day = String(currentDay.getDate()).padStart(2, '0');
                weekendDates.push(`${year}${month}${day}`);
            }
        }
    }

    return weekendDates;
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

function extractMatchups(data, weekNum) {
    if (!data?.events) return [];
    const matchups = [];

    data.events.forEach(event => {
        const seasonType = event.season?.type;
        if (seasonType !== 2) return;

        const comp = event.competitions?.[0];
        if (!comp) return;

        const gameId = event.id;
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
            id: parseInt(gameId, 10),
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

/**
 * 🧠 SYNC TEAM RECORDS FROM ESPN API
 */
async function syncTeamRecords() {
    const { NbaTeams } = db;
    try {
        const teams = await NbaTeams.findAll();
        for (const team of teams) {
            if (!team.team_id) continue;
            try {
                // Target the overall team record endpoint (using type 2 regular season or general records list)
                const recordUrl = `http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2027/types/1/groups/7/teams/${team.team_id}/records/34?lang=en&region=us`;
                const { data } = await axios.get(recordUrl, { timeout: 10000 });

                // Look for the overall record entry (usually type 'total' or 'overall', or fallback to the first item's summary)
                let overallSummary = "";
                const recordsList = Array.isArray(data) ? data : (data.items || data.records || []);

                const overallRec = recordsList.find(r => r.type === "total" || r.type === "overall" || r.name === "Overall");
                if (overallRec) {
                    overallSummary = overallRec.summary || overallRec.displayValue;
                } else if (recordsList.length > 0) {
                    // Fallback to the first record summary found if overall isn't explicitly named
                    overallSummary = recordsList[0].summary || recordsList[0].displayValue;
                } else if (data.summary) {
                    overallSummary = data.summary;
                }

                if (overallSummary) {
                    team.record = overallSummary;
                    await team.save();
                }
            } catch (err) {
                console.error(`[NBA Sync] Failed to fetch record for team_id ${team.team_id}:`, err.message);
            }
        }
        console.log("[NBA Sync] Team records updated successfully.");
    } catch (err) {
        console.error("[NBA Sync] Error syncing team records:", err);
    }
}

async function evaluateSurvivorResults() {
    const { NbaSurvivorEntries, NbaSurvivorPicks, NbaRegularSeasonGames } = db;
    try {
        const completedGames = await NbaRegularSeasonGames.findAll({
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

        const entries = await NbaSurvivorEntries.findAll();
        const allPicks = await NbaSurvivorPicks.findAll();

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

        console.log("[NBA Survivor] Automated eliminations evaluated successfully.");
    } catch (err) {
        console.error("[NBA Survivor] Error evaluating automated survivor outcomes:", err);
    }
}

async function processMatchup(m) {
    const { NbaRegularSeasonGames } = db;
    try {
        const existingGame = await NbaRegularSeasonGames.findOne({
            where: { id: m.id }
        });

        if (!existingGame) {
            await NbaRegularSeasonGames.create(m);
        } else {
            let payloadToUpdate = { ...m };

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
        console.error(`[NBA sync] Error saving matchup Week ${m.week} (${m.away_team} @ ${m.home_team}):`, err.message);
    }
}

async function syncNbaWeek(targetWeek) {
    const dateStrings = getWeekendDatesForNbaWeek(targetWeek);
    console.log(`[NBA Sync] Syncing Week ${targetWeek} weekend dates (Fri-Sun): ${dateStrings.join(", ")}`);

    let allMatchups = [];

    for (const dateStr of dateStrings) {
        try {
            const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`;
            const { data } = await axios.get(url, { timeout: 15000 });

            const dailyMatchups = extractMatchups(data, targetWeek);
            allMatchups = allMatchups.concat(dailyMatchups);
        } catch (err) {
            console.error(`[NBA Sync] Error fetching scoreboard for date ${dateStr}:`, err.message);
        }
    }

    for (const m of allMatchups) {
        await processMatchup(m);
    }
    console.log(`[NBA Sync] Successfully synced ${allMatchups.length} weekend matchups for Week ${targetWeek}.`);
}

async function syncNbaSeason() {
    const currentWeek = getCurrentAndNextNbaWeeks();
    const targetWeeks = [currentWeek, currentWeek + 1, currentWeek + 2];

    console.log(`[NBA Sync Job] Current Active Week: Week ${currentWeek} | Syncing Weeks: ${targetWeeks.join(", ")}`);

    for (const wk of targetWeeks) {
        await syncNbaWeek(wk);
    }

    await evaluateSurvivorResults();
    await syncTeamRecords(); // 👈 Update records after syncing season data
}

module.exports = syncNbaSeason;