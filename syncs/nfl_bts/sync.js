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
    // If today is Monday (1) or Tuesday (2), the "current" football week started last Wednesday.
    // If today is Wednesday (3) through Saturday (6) or Sunday (0), it started this past Wednesday.
    let distanceToWednesday = (dayOfWeek >= 3) ? (dayOfWeek - 3) : (dayOfWeek + 4);

    const currentWednesday = new Date(now);
    currentWednesday.setDate(now.getDate() - distanceToWednesday);

    // We want a 2-week window ending 14 days later (covering this week + next week)
    const twoWeeksOut = new Date(currentWednesday);
    twoWeeksOut.setDate(currentWednesday.getDate() + 50); // Covers Wednesday through Tuesday 2 weeks later

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };
    console.log(currentWednesday, twoWeeksOut)

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

        let rawSpread = 3.0;
        let spreadOdds = -110;
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

            // 2. Extract precise close odds from oddsObj.pointSpread if available
            const ps = oddsObj.pointSpread;
            if (ps && ps.home && ps.away) {
                const homeLine = parseFloat(ps.home.close?.line ?? ps.home.open?.line ?? 0);
                const homeOdds = parseInt(ps.home.close?.odds ?? ps.home.open?.odds ?? -110, 10);

                const awayLine = parseFloat(ps.away.close?.line ?? ps.away.open?.line ?? 0);
                const awayOdds = parseInt(ps.away.close?.odds ?? ps.away.open?.odds ?? -110, 10);

                // Whichever team has the negative line is the favorite; grab its exact juice
                if (!isNaN(homeLine) && homeLine < 0) {
                    spreadOdds = isNaN(homeOdds) ? -110 : homeOdds;
                } else if (!isNaN(awayLine) && awayLine < 0) {
                    spreadOdds = isNaN(awayOdds) ? -110 : awayOdds;
                }
            }
        }

        const overUnder = oddsObj?.overUnder !== undefined ? parseFloat(oddsObj.overUnder) : 0.0;

        const finalSpread = -rawSpread;
        const adjustedSpread = applyHookRule(rawSpread, spreadOdds);

        matchups.push({
            week: weekNum,
            home_team: homeCompetitor.team.name,
            away_team: awayCompetitor.team.name,
            home_logo: homeCompetitor.team.logo || null,
            away_logo: awayCompetitor.team.logo || null,
            home_color: homeCompetitor.team.color ? `#${homeCompetitor.team.color}` : null,
            away_color: awayCompetitor.team.color ? `#${awayCompetitor.team.color}` : null,
            spread: finalSpread,
            spread_odds: spreadOdds,
            adjusted_spread: adjustedSpread,
            over_under: overUnder,
            favorite: favoriteTeamName,
            game_date: gameDate,
            status: comp.status?.type?.name || "STATUS_SCHEDULED"
        });
    });

    return matchups;
}

async function processMatchup(m) {
    const { NflBtsGames } = db;
    try {
        const [game, created] = await NflBtsGames.findOrCreate({
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

async function syncNflBts() {
    try {
        const dateRange = getDynamicDateRange();
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20260909-20260922`;

        console.log(`[NFL BTS sync] Fetching scoreboard data for range: ${dateRange}`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const matchups = extractMatchups(data);
        for (const m of matchups) {
            await processMatchup(m);
        }
        console.log(`[NFL BTS sync] Successfully synced ${matchups.length} matchups.`);
    } catch (err) {
        console.error("[NFL BTS sync] Fatal Error:", err.message);
    }
}

module.exports = syncNflBts;