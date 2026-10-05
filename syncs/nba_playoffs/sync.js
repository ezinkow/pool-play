const axios = require("axios");
const db = require("../../models");

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20260418-20260620";

const ROUND_CONFIG = {
    1: { label: "R1", maxPoints: 32 },
    2: { label: "R2", maxPoints: 24 },
    3: { label: "R3", maxPoints: 16 },
    4: { label: "Finals", maxPoints: 8 },
};

function getRound(headline) {
    if (headline && headline.includes("Finals") && !headline.includes("West") && !headline.includes("East")) return 4;
    if (headline && (headline.includes("West Finals") || headline.includes("East Finals"))) return 3;
    if (headline && (headline.includes("West Semifinals") || headline.includes("East Semifinals"))) return 2;
    return 1;
}

function getConference(headline) {
    if (!headline) return "";
    if (headline.includes("East")) return "E";
    if (headline.includes("West")) return "W";
    return "";
}

function extractSeries(data) {
    if (!data?.events) return [];
    const seriesMap = new Map();

    data.events.forEach(event => {
        const comp = event.competitions?.[0];
        if (!comp || !comp.series) return;

        // 🧠 NORMALIZE TEAMS: Sort alphabetically so "Home" vs "Away" never flips ID
        const teams = comp.competitors.map(c => ({
            id: c.id,
            name: c.team.displayName,
            logo: c.team.logo,
            seed: c.seed,
            wins: comp.series.competitors.find(s => String(s.id) === String(c.id))?.wins || 0
        })).sort((a, b) => a.name.localeCompare(b.name));

        const headline = comp.notes?.[0]?.headline || "";
        const roundNum = getRound(headline);
        const conf = getConference(headline);

        // Use normalized team names for a stable ID
        const seriesId = `R${roundNum}-${conf}-${teams[0].name.replace(/\s+/g, '')}-vs-${teams[1].name.replace(/\s+/g, '')}`;

        const existing = seriesMap.get(seriesId) || {
            id: seriesId,
            roundNum, conf,
            t1: teams[0], t2: teams[1],
            t1Wins: 0, t2Wins: 0,
            startDate: event.date
        };

        // Always take the latest win data
        existing.t1Wins = Math.max(existing.t1Wins, teams[0].wins);
        existing.t2Wins = Math.max(existing.t2Wins, teams[1].wins);

        seriesMap.set(seriesId, existing);
    });
    return Array.from(seriesMap.values());
}

async function processSeries(s) {
    const { NbaSeries } = db;
    try {
        const roundCfg = ROUND_CONFIG[s.roundNum];
        const hasWinner = s.t1Wins === 4 || s.t2Wins === 4;

        const winner = hasWinner ? (s.t1Wins === 4 ? s.t1.name : s.t2.name) : null;
        const isLocked = new Date() >= new Date(s.startDate) || (s.t1Wins + s.t2Wins) > 0;

        await NbaSeries.upsert({
            id: s.id,
            round: s.roundNum,
            round_label: roundCfg.label,
            round_points_max: roundCfg.maxPoints,
            home_team: s.t1.name, // Logic: Store as t1/t2 to avoid confusion
            away_team: s.t2.name,
            home_logo: s.t1.logo,
            away_logo: s.t2.logo,
            home_seed: s.t1.seed || null,
            away_seed: s.t2.seed || null,
            status: hasWinner ? "STATUS_FINAL" : "STATUS_IN_PROGRESS",
            game_date: s.startDate,
            home_wins: s.t1Wins,
            away_wins: s.t2Wins,
            locked: isLocked,
            winner: winner
        });
    } catch (err) {
        console.error(`[NBA sync] Error on ${s.id}:`, err.message);
    }
}

async function syncNba() {
    try {
        const { data } = await axios.get(SCOREBOARD_URL, { timeout: 15000 });
        const series = extractSeries(data);
        for (const s of series) await processSeries(s);
    } catch (err) {
        console.error("[NBA sync] Fatal Error:", err.message);
    }
}

module.exports = syncNba;