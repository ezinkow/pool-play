const axios = require("axios");
const db = require("../../models");

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20270418-20270622";

const ROUND_CONFIG = {
    1: { label: "R1", maxPoints: 32, targetWins: 4 }, // NBA R1 is Best-of-7 (First to 4 wins)
    2: { label: "R2", maxPoints: 24, targetWins: 4 }, // Best-of-7
    3: { label: "R3", maxPoints: 16, targetWins: 4 }, // Best-of-7
    4: { label: "Finals", maxPoints: 8, targetWins: 4 }, // Best-of-7
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
            abbreviation: c.team.abbreviation,
            logo: c.team.logo,
            seed: c.seed,
            wins: comp.series.competitors.find(s => String(s.id) === String(c.id))?.wins || 0
        })).sort((a, b) => a.name.localeCompare(b.name));

        const headline = comp.notes?.[0]?.headline || "";
        const roundNum = getRound(headline);
        const conf = getConference(headline);

        const seriesId = `R${roundNum}-${conf}-${teams[0].name.replace(/\s+/g, '')}-vs-${teams[1].name.replace(/\s+/g, '')}`;

        const espnSeries = comp.series;
        const seriesSummaryText = espnSeries?.summary || "";
        const seriesCompleted = espnSeries?.completed || false;

        const existing = seriesMap.get(seriesId) || {
            id: seriesId,
            roundNum, conf,
            t1: teams[0], t2: teams[1],
            t1Wins: 0, t2Wins: 0,
            seriesSummary: seriesSummaryText,
            seriesCompleted: seriesCompleted,
            startDate: event.date
        };

        // Always take the latest win data
        existing.t1Wins = Math.max(existing.t1Wins, teams[0].wins);
        existing.t2Wins = Math.max(existing.t2Wins, teams[1].wins);

        if (seriesSummaryText) {
            existing.seriesSummary = seriesSummaryText;
        }
        if (seriesCompleted) {
            existing.seriesCompleted = true;
        }

        seriesMap.set(seriesId, existing);
    });
    return Array.from(seriesMap.values());
}

async function processSeries(s) {
    const { NbaSeries } = db;
    try {
        const roundCfg = ROUND_CONFIG[s.roundNum];
        let winnerName = null;

        // Match summary text parsing using team abbreviations (e.g. "BOS win series 4-2")
        const summaryText = s.seriesSummary || "";
        const t1Abbr = s.t1.abbreviation;
        const t2Abbr = s.t2.abbreviation;

        if (summaryText && t1Abbr && t2Abbr) {
            if (summaryText.includes(t1Abbr)) {
                winnerName = s.t1.name;
            } else if (summaryText.includes(t2Abbr)) {
                winnerName = s.t2.name;
            }
        }

        // Fallback target check if abbreviation match wasn't found in summary
        const targetWins = roundCfg.targetWins;
        if (!winnerName) {
            if (s.t1Wins === targetWins) winnerName = s.t1.name;
            if (s.t2Wins === targetWins) winnerName = s.t2.name;
        }

        const hasWinner = s.seriesCompleted || s.t1Wins === targetWins || s.t2Wins === targetWins || Boolean(winnerName && (s.t1Wins === targetWins || s.t2Wins === targetWins));
        const isLocked = new Date() >= new Date(s.startDate) || (s.t1Wins + s.t2Wins) > 0;

        await NbaSeries.upsert({
            id: s.id,
            round: s.roundNum,
            round_label: roundCfg.label,
            round_points_max: roundCfg.maxPoints,
            home_team: s.t1.name,
            away_team: s.t2.name,
            home_logo: s.t1.logo,
            away_logo: s.t2.logo,
            home_seed: s.t1.seed || null,
            away_seed: s.t2.seed || null,
            status: hasWinner ? "STATUS_FINAL" : ((s.t1Wins + s.t2Wins > 0) ? "STATUS_IN_PROGRESS" : "STATUS_SCHEDULED"),
            game_date: s.startDate,
            home_wins: s.t1Wins,
            away_wins: s.t2Wins,
            locked: isLocked,
            winner: hasWinner ? winnerName : null
        });
    } catch (err) {
        console.error(`[NBA Playoffs Sync] Error on ${s.id}:`, err.message);
    }
}

async function syncNbaPlayoffs() {
    try {
        const { data } = await axios.get(SCOREBOARD_URL, { timeout: 15000 });
        const series = extractSeries(data);
        for (const s of series) await processSeries(s);
    } catch (err) {
        console.error("[NBA Playoffs Sync] Fatal Error:", err.message);
    }
}

module.exports = syncNbaPlayoffs;