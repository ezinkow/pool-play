const fetch = require("node-fetch");
const db = require("../../models");

const TOURNAMENT_IDS = new Set(["22"]);

async function syncPickemGames() {
    const { GamesPickem } = db;
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=306&dates=20260319-20260406";

    try {
        const response = await fetch(url);
        const data = await response.json();
        const now = new Date();

        const existingGames = await GamesPickem.findAll();
        const existingMap = {};
        for (const g of existingGames) existingMap[g.id] = g;

        for (const event of data.events) {
            const comp = event?.competitions?.[0];
            if (!comp) continue;

            const headline = comp.notes?.[0]?.headline || "";
            const tournamentId = (event.tournamentId || comp.tournamentId)?.toString();
            if (!TOURNAMENT_IDS.has(tournamentId) && !(comp.type?.id === "6" && headline.includes("- Final"))) continue;

            const home = comp?.competitors?.find(c => c.homeAway === "home");
            const away = comp?.competitors?.find(c => c.homeAway === "away");
            const homeTeam = home?.team?.shortDisplayName || "TBD";
            const awayTeam = away?.team?.shortDisplayName || "TBD";
            const homeLogo = home?.team?.logo || null;
            const awayLogo = away?.team?.logo || null;

            const eventDate = new Date(event.date);
            const lineLockedTime = new Date(eventDate.getTime() - 60 * 60 * 1000);
            const status = event.status?.type?.name || "STATUS_SCHEDULED";
            const isLocked = now >= lineLockedTime;
            const existingGame = existingMap[event.id];

            // Odds Logic
            let favorite = homeTeam, underdog = awayTeam, currentLine = null;
            const odds = comp?.odds?.[0];
            if (odds && home && away) {
                if (odds.homeTeamOdds?.favorite) { favorite = homeTeam; underdog = awayTeam; }
                else if (odds.awayTeamOdds?.favorite) { favorite = awayTeam; underdog = homeTeam; }
                currentLine = odds.spread ? Math.abs(Number(odds.spread)) : null;
            }

            const favLogo = favorite === homeTeam ? homeLogo : awayLogo;
            const dogLogo = underdog === homeTeam ? homeLogo : awayLogo;

            const payload = {
                id: event.id,
                game_date: event.date,
                line_locked_time: lineLockedTime,
                home_team: homeTeam !== "TBD" ? homeTeam : (existingGame?.home_team || "TBD"),
                away_team: awayTeam !== "TBD" ? awayTeam : (existingGame?.away_team || "TBD"),
                home_logo: homeLogo || existingGame?.home_logo,
                away_logo: awayLogo || existingGame?.away_logo,
                fav_logo: isLocked ? (existingGame?.fav_logo || favLogo) : favLogo,
                dog_logo: isLocked ? (existingGame?.dog_logo || dogLogo) : dogLogo,
                home_score: parseInt(home?.score || 0),
                away_score: parseInt(away?.score || 0),
                status,
                game_clock: event.status?.type?.shortDetail || "",
                line: isLocked ? (existingGame?.line || currentLine) : currentLine,
                favorite: isLocked ? (existingGame?.favorite || favorite) : favorite,
                underdog: isLocked ? (existingGame?.underdog || underdog) : underdog,
                selectable: homeTeam !== "TBD" && awayTeam !== "TBD",
                winner: (() => {
                    if (status !== "STATUS_FINAL") return null;
                    const fScore = (isLocked ? existingGame?.favorite : favorite) === homeTeam ? parseInt(home.score) : parseInt(away.score);
                    const dScore = (isLocked ? existingGame?.favorite : favorite) === homeTeam ? parseInt(away.score) : parseInt(home.score);
                    const line = isLocked ? existingGame?.line : currentLine;
                    return (fScore - dScore) > line ? (isLocked ? existingGame.favorite : favorite) : (isLocked ? existingGame.underdog : underdog);
                })()
            };

            await GamesPickem.upsert(payload);
        }
        return true;
    } catch (error) {
        console.error("Pickem Sync Error:", error);
        return false;
    }
}
module.exports = syncPickemGames;