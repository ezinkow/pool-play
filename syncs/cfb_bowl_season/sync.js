const axios = require("axios");
const db = require("../../models");

/**
 * 🧠 FETCH TEAM RANKINGS FROM ESPN CORE API FOR POST-SEASON
 */
async function fetchPostseasonTeamRankings() {
    const rankingsMap = {};
    try {
        const rankingsUrl = `http://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/types/3/weeks/1/rankings/1?lang=en&region=us`;
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
        console.log(`[CFB Bowl Sync] Post-season rankings endpoint not active or returned error.`);
    }
    return rankingsMap;
}

async function extractBowlMatchups(data) {
    if (!data?.events) return [];
    const matchups = [];

    const rankingsMap = await fetchPostseasonTeamRankings();
    const { CfbBowlSeasonGames } = db;

    for (const event of data.events) {
        const seasonType = event.season?.type;
        if (seasonType !== 3) continue;

        const comp = event.competitions?.[0];
        if (!comp) continue;

        const gameId = event.id;
        const gameDate = event.date;

        const notesObj = comp.notes?.[0] || event.notes?.[0];
        const bowlGameName = notesObj?.headline || event.shortName || "Bowl Game";

        const homeCompetitor = comp.competitors.find(c => c.homeAway === "home");
        const awayCompetitor = comp.competitors.find(c => c.awayAway === "away" || c.homeAway === "away");

        if (!homeCompetitor || !awayCompetitor) continue;

        const homeTeamId = homeCompetitor.team.id || null;
        const awayTeamId = awayCompetitor.team.id || null;

        // Check if teams are placeholder / TBD
        const isHomeTbd = homeCompetitor.team.isTBA || homeCompetitor.team.displayName?.includes("TBD") || !homeCompetitor.team.shortDisplayName;
        const isAwayTbd = awayCompetitor.team.isTBA || awayCompetitor.team.displayName?.includes("TBD") || !awayCompetitor.team.shortDisplayName;

        const homeTeamSchool = isHomeTbd ? "TBDH" : (homeCompetitor.team.shortDisplayName || homeCompetitor.team.location);
        const awayTeamSchool = isAwayTbd ? "TBDA" : (awayCompetitor.team.shortDisplayName || awayCompetitor.team.location);

        const homeTeamMascot = isHomeTbd ? "" : (homeCompetitor.team.name || homeCompetitor.team.nickname);
        const awayTeamMascot = isAwayTbd ? "" : (awayCompetitor.team.name || awayCompetitor.team.nickname);

        const homeColor = homeCompetitor.team.color ? `#${homeCompetitor.team.color.replace('#', '')}` : null;
        const homeSecondaryColor = homeCompetitor.team.alternateColor ? `#${homeCompetitor.team.alternateColor.replace('#', '')}` : (homeCompetitor.team.secondaryColor ? `#${homeCompetitor.team.secondaryColor.replace('#', '')}` : null);

        const awayColor = awayCompetitor.team.color ? `#${awayCompetitor.team.color.replace('#', '')}` : null;
        const awaySecondaryColor = awayCompetitor.team.alternateColor ? `#${awayCompetitor.team.alternateColor.replace('#', '')}` : (awayCompetitor.team.secondaryColor ? `#${awayCompetitor.team.secondaryColor.replace('#', '')}` : null);

        const existingGame = await CfbBowlSeasonGames.findOne({
            where: { id: gameId }
        });

        let rawSpread = null;
        let favoriteTeamSchool = homeTeamSchool;
        let favoriteTeamId = homeTeamId;

        const oddsObj = Array.isArray(comp.odds) ? comp.odds[0] : comp.odds;

        if (oddsObj) {
            if (oddsObj.spread !== undefined && oddsObj.spread !== null) {
                rawSpread = parseFloat(oddsObj.spread);
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
        let finalSpread = rawSpread !== null ? rawSpread : null;

        const homeScore = homeCompetitor.score !== undefined ? parseInt(homeCompetitor.score, 10) : null;
        const awayScore = awayCompetitor.score !== undefined ? parseInt(awayCompetitor.score, 10) : null;
        const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
        const liveStatus = comp.status?.type?.shortDetail;

        let lockedSpread = finalSpread;
        let lockedFavorite = favoriteTeamSchool;
        let lockedFavoriteId = favoriteTeamId;
        let lockedOverUnder = overUnder;
        let lockedSpreadOdds = homeSpreadOdds;

        if (existingGame) {
            const kickoffTime = existingGame.game_date ? new Date(existingGame.game_date).getTime() : new Date(gameDate).getTime();
            const now = Date.now();
            const hoursUntilKickoff = (kickoffTime - now) / (1000 * 60 * 60);

            const isAlreadyFinal = existingGame.status === "STATUS_FINAL" || existingGame.status === "Final" || existingGame.status === "completed";

            if ((hoursUntilKickoff <= 48 && !isAlreadyFinal) || isAlreadyFinal) {
                lockedSpread = existingGame.spread !== null ? existingGame.spread : finalSpread;
                lockedFavorite = existingGame.favorite || favoriteTeamSchool;
                lockedFavoriteId = existingGame.favorite_id || favoriteTeamId;
                lockedOverUnder = existingGame.over_under !== null ? existingGame.over_under : overUnder;
                lockedSpreadOdds = existingGame.spread_odds !== null ? existingGame.spread_odds : homeSpreadOdds;
            }
        }

        const isFinal = statusType === "STATUS_FINAL" || statusType === "Final" || statusType === "completed" || (liveStatus && liveStatus.toLowerCase().includes("final"));

        let calculatedOutcomes = { home_score: homeScore, away_score: awayScore, winner: null };
        if (isFinal && homeScore !== null && awayScore !== null) {
            calculatedOutcomes = calculateGameOutcomes({
                home_team: homeTeamSchool,
                away_team: awayTeamSchool
            }, homeScore, awayScore);
        }

        const getTeamRank = (teamObj) => {
            if (!teamObj || !teamObj.id) return null;
            return rankingsMap[String(teamObj.id)] || null;
        }

        matchups.push({
            id: gameId,
            bowl_game: bowlGameName,
            home_team_id: homeTeamId,
            home_team: homeTeamSchool,
            home_team_nickname: homeTeamMascot,
            home_team_rank: getTeamRank(homeCompetitor.team),
            away_team_id: awayTeamId,
            away_team: awayTeamSchool,
            away_team_nickname: awayTeamMascot,
            away_team_rank: getTeamRank(awayCompetitor.team),
            home_logo: isHomeTbd ? null : (homeCompetitor.team.logo || null),
            away_logo: isAwayTbd ? null : (awayCompetitor.team.logo || null),
            home_color: homeColor,
            home_secondary_color: homeSecondaryColor,
            away_color: awayColor,
            away_secondary_color: awaySecondaryColor,
            spread: lockedSpread,
            spread_odds: lockedSpreadOdds,
            over_under: lockedOverUnder,
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
        return { home_score: null, away_score: null, winner: null };
    }

    let winner = "PUSH";
    if (homeScore > awayScore) winner = m.home_team;
    else if (awayScore > homeScore) winner = m.away_team;

    return { home_score: homeScore, away_score: awayScore, winner };
}

async function processBowlMatchup(m) {
    const { CfbBowlSeasonGames } = db;
    try {
        const existingGame = await CfbBowlSeasonGames.findOne({
            where: { id: m.id }
        });

        if (!existingGame) {
            await CfbBowlSeasonGames.create(m);
        } else {
            // Note: omitting bowl_logo from m ensures your manual data remains untouched
            await existingGame.update(m);
        }
    } catch (err) {
        console.error(`[CFB Bowl Sync] Error saving bowl matchup (${m.bowl_game}: ${m.away_team} vs ${m.home_team}):`, err.message);
    }
}

async function syncCfbBowlSeasonGames() {
    try {
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?seasontype=3&limit=500`;

        console.log(`[CFB Bowl Sync] Fetching all post-season bowl games...`);
        const { data } = await axios.get(scoreboardUrl, { timeout: 15000 });

        const matchups = await extractBowlMatchups(data);
        for (const m of matchups) {
            await processBowlMatchup(m);
        }
        console.log(`[CFB Bowl Sync] Successfully synced ${matchups.length} bowl games.`);

    } catch (err) {
        console.error(`[CFB Bowl Sync] Fatal Error:`, err.response?.status, err.response?.data || err.message);
    }
}

module.exports = syncCfbBowlSeasonGames;