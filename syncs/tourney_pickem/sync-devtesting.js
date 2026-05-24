const fetch = require("node-fetch");
const { Games } = require("../models");

const CONFERENCES = new Set(["4", "7", "23", "62", "2", "8", "44", "3", "11"]);

function formatDateET(date) {
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric"
    });
}

function formatTimeET(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
    });
}

async function syncGames() {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=200&dates=20260305-20260315";

    const response = await fetch(url);
    const data = await response.json();
    const now = new Date();

    for (const event of data.events) {
        const comp = event?.competitions?.[0];
        if (!comp) continue;
        // console.log('coooommmppppp', comp)
        const home = comp.competitors.find(c => c.homeAway === "home");
        const away = comp.competitors.find(c => c.homeAway === "away");
        if (!home || !away) continue;

        const homeConf = home.team.conferenceId?.toString();
        const awayConf = away.team.conferenceId?.toString();
        if (!CONFERENCES.has(homeConf) && !CONFERENCES.has(awayConf)) continue;
        const gameStart = formatDateET(event.date)
        const event_date = new Date(event.date);
        // Set lock time to 1 hour before game time
        const lineLockedTime = new Date(event_date.getTime() - 60 * 60 * 1000);
        const status = event.status.type.name;

        // --- ODDS & LINE LOGIC ---
        const odds = comp.odds?.[0];
        let favorite = home.team.shortDisplayName;
        let underdog = away.team.shortDisplayName;
        let fav_logo = home.team.logo;
        let dog_logo = away.team.logo;
        let currentLine = null;

        if (odds) {
            if (odds.homeTeamOdds?.favorite === 'true') {
                favorite = home.team.shortDisplayName;
                underdog = away.team.shortDisplayName;
                fav_logo = home.team.logo;
                dog_logo = away.team.logo;
            } else if (odds.awayTeamOdds?.favorite === 'true') {
                favorite = away.team.shortDisplayName;
                underdog = home.team.shortDisplayName;
                fav_logo = away.team.logo;
                dog_logo = home.team.logo;
            } else if (odds.details) {
                const favAbbr = odds.details.split(" ")[0];
                if (away.team.abbreviation === favAbbr) {
                    favorite = away.team.shortDisplayName;
                    underdog = home.team.shortDisplayName;
                    fav_logo = away.team.logo;
                    dog_logo = home.team.logo;
                }
            }
            currentLine = odds.spread ? Math.abs(Number(odds.spread)) : null;
        }

        // --- DB UPSERT WITH LOCK LOGIC ---
        const existingGame = await Games.findByPk(event.id);
        const isLocked = now >= lineLockedTime;

        // ⚡ OPTIMIZATION: Check if data actually changed before hitting the DB
        const newScore = parseInt(home.score || 0);
        const newAwayScore = parseInt(away.score || 0);
        const newStatus = event.status.type.shortDetail;

        // If the game exists AND scores/status haven't changed AND it's locked (so line won't change)
        // then SKIP the upsert to save a database "question"
        if (existingGame &&
            existingGame.home_score === newScore &&
            existingGame.away_score === newAwayScore &&
            existingGame.game_clock === newStatus &&
            isLocked) {
            continue;
        }

        await Games.upsert({
            id: event.id,
            game_date: event.date,
            line_locked_time: lineLockedTime, // Saved as 1 hour before tip
            home_team: home.team.shortDisplayName,
            away_team: away.team.shortDisplayName,
            home_logo: home.team.logo,
            away_logo: away.team.logo,
            home_score: parseInt(home.score || 0),
            away_score: parseInt(away.score || 0),
            status: status,
            game_clock: event.status.type.shortDetail,
            winner: status === "STATUS_FINAL" ? (parseInt(home.score) > parseInt(away.score) ? home.team.shortDisplayName : away.team.shortDisplayName) : null,

            // 🔥 The Logic: If locked, use existing data. If not, update with current ESPN data.
            line: isLocked ? existingGame?.line : currentLine,
            favorite: isLocked ? existingGame?.favorite : favorite,
            underdog: isLocked ? existingGame?.underdog : underdog,
            fav_logo: isLocked ? existingGame?.fav_logo : fav_logo,
            dog_logo: isLocked ? existingGame?.dog_logo : dog_logo
        });
    }
    return true;
}

module.exports = syncGames;