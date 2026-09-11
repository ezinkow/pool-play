const { MlbEntries, Users, MlbPicks, MlbSeries, MlbTiebreaker } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");

const ROUND_CONFIG = {
    1: { label: "R1", maxPoints: 32 },
    2: { label: "R2", maxPoints: 24 },
    3: { label: "R3", maxPoints: 16 },
    4: { label: "Finals", maxPoints: 8 },
};

module.exports = function (app) {

    // GET /api/mlb/entries/me — get current user's entry info
    app.get("/api/mlb/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await MlbEntries.findOne({ where: { user_id: req.user.id } });
            if (!entry) {
                return res.json({ entry: null });
            }
            res.json({ entry });
        } catch (err) {
            console.error("Error fetching current user entry:", err);
            res.status(500).json({ error: "Failed to fetch entry" });
        }
    });

    // POST /api/mlb/entries — create or join pool entry
    app.post("/api/mlb/entries", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            // Check if display name is taken by someone else
            const nameTaken = await MlbEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const [entry, created] = await MlbEntries.findOrCreate({
                where: { user_id: req.user.id },
                defaults: { entry_name },
            });

            if (!created && entry.entry_name !== entry_name) {
                entry.entry_name = entry_name;
                await entry.save();
            }

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // DELETE /api/mlb/entries/me — leave pool entry
    app.delete("/api/mlb/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await MlbEntries.findOne({ where: { user_id: req.user.id } });
            if (!entry) {
                return res.status(404).json({ error: "Entry not found" });
            }

            // Optional: Check if pool/series have started/locked before leaving
            const activeLockedSeries = await MlbSeries.findOne({ where: { locked: true } });
            if (activeLockedSeries) {
                return res.status(403).json({ error: "Cannot leave pool after games have locked." });
            }

            await MlbPicks.destroy({ where: { user_id: req.user.id } });
            await MlbTiebreaker.destroy({ where: { user_id: req.user.id } });
            await entry.destroy();

            res.json({ success: true });
        } catch (err) {
            console.error("Error leaving pool:", err);
            res.status(500).json({ error: "Failed to leave the pool" });
        }
    });

    // GET /api/mlb/entries/check/:name
    app.get("/api/mlb/entries/check/:name", async (req, res) => {
        try {
            const { name } = req.params;

            if (name.toLowerCase() === "admin" || name.toLowerCase() === "me") {
                return res.json({ exists: true });
            }

            const user = await Users.findOne({ where: { name } });
            if (!user) return res.json({ exists: false });

            const entry = await MlbEntries.findOne({ where: { user_id: user.id } });
            res.json({ exists: !!entry });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // GET /api/mlb/entries
    app.get("/api/mlb/entries", async (req, res) => {
        try {
            const entries = await MlbEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // GET /api/mlb/picks?name=X
    app.get("/api/mlb/picks", async (req, res) => {
        try {
            const { name } = req.query;

            if (!name || name === "undefined" || name === "SELECT YOUR NAME") {
                return res.json([]);
            }

            const entry = await MlbEntries.findOne({ where: { entry_name: name } });
            if (!entry) return res.json([]);

            const picks = await MlbPicks.findAll({
                where: { user_id: entry.user_id },
                include: [{
                    model: MlbSeries,
                    as: 'series',
                    attributes: [
                        "id", "round", "round_label", "round_points_max",
                        "home_team", "away_team", "home_logo", "away_logo",
                        "home_seed", "away_seed", "home_wins", "away_wins",
                        "winner", "series_length", "status", "locked", "game_date"
                    ],
                }],
            });
            res.json(picks);
        } catch (err) {
            console.error("GET Picks Error:", err);
            res.status(500).json({ error: "Failed to load picks" });
        }
    });

    // POST /api/mlb/picks/bulk
    app.post("/api/mlb/picks/bulk", requireAuth, async (req, res) => {
        try {
            const { picks } = req.body;
            if (!Array.isArray(picks) || picks.length === 0) {
                return res.status(400).json({ error: "No picks provided" });
            }

            const entry = await MlbEntries.findOne({ where: { user_id: req.user.id } });
            if (!entry) return res.status(403).json({ error: "Join the pool first!" });

            const seriesIds = picks.map(p => p.series_id);
            const seriesInDb = await MlbSeries.findAll({ where: { id: seriesIds } });

            const picksByRound = {};

            seriesInDb.forEach(s => {
                if (!picksByRound[s.round]) {
                    picksByRound[s.round] = {
                        config: ROUND_CONFIG[s.round],
                        totalPoints: 0,
                        label: s.round_label
                    };
                }

                const pickData = picks.find(p => p.series_id === s.id);
                if (pickData) {
                    picksByRound[s.round].totalPoints += (parseInt(pickData.confidence) || 0);
                }
            });

            for (const rNum in picksByRound) {
                const round = picksByRound[rNum];
                if (round.totalPoints > round.config.maxPoints) {
                    return res.status(400).json({
                        error: `Total points (${round.totalPoints}) exceeds ${round.label} Max (${round.config.maxPoints})`
                    });
                }
            }

            const lockedSeriesInDb = seriesInDb.filter(s => s.locked);
            const existingPicks = await MlbPicks.findAll({ where: { user_id: req.user.id } });

            for (const submittedPick of picks) {
                const isLocked = lockedSeriesInDb.some(ls => ls.id === submittedPick.series_id);

                if (isLocked) {
                    const currentPickInDb = existingPicks.find(ep => ep.series_id === submittedPick.series_id);

                    const hasChanged = currentPickInDb && (
                        currentPickInDb.pick !== submittedPick.pick ||
                        currentPickInDb.confidence !== parseInt(submittedPick.confidence) ||
                        currentPickInDb.series_length_guess !== parseInt(submittedPick.series_length_guess)
                    );

                    if (hasChanged) {
                        return res.status(400).json({
                            error: `Series ${submittedPick.series_id} is locked. You cannot change your pick once a game has started.`
                        });
                    }
                }
            }

            for (const p of picks) {
                await MlbPicks.upsert({
                    user_id: req.user.id,
                    series_id: p.series_id,
                    pick: p.pick,
                    confidence: parseInt(p.confidence),
                    series_length_guess: p.series_length_guess ? parseInt(p.series_length_guess) : null,
                });
            }

            res.json({ success: true });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to save picks" });
        }
    });

    // GET /api/mlb/picks/all (For the Group Matrix / Standings)
    app.get("/api/mlb/picks/all", async (req, res) => {
        try {
            const picks = await MlbPicks.findAll({
                include: [{
                    model: MlbSeries,
                    as: 'series',
                    attributes: [
                        "id", "round", "round_label", "locked",
                        "home_team", "away_team", "home_seed", "away_seed",
                        "home_wins", "away_wins", "winner", "series_length", "status"
                    ],
                }],
            });

            const entries = await MlbEntries.findAll();
            const entryMap = {};
            entries.forEach(e => { entryMap[e.user_id] = e.entry_name; });

            const result = picks
                .filter(p => p.series?.locked)
                .map(p => ({
                    user_id: p.user_id,
                    entry_name: entryMap[p.user_id] || "Unknown",
                    series_id: p.series_id,
                    pick: p.pick,
                    confidence: p.confidence,
                    series_length_guess: p.series_length_guess,
                    series: p.series,
                }));

            res.json(result);
        } catch (err) {
            console.error("GET All Picks Error:", err);
            res.status(500).json({ error: "Failed to load group picks" });
        }
    });

    // GET /api/mlb/series — all series ordered by round then slot
    app.get("/api/mlb/series", async (req, res) => {
        try {
            const series = await MlbSeries.findAll({
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series" });
        }
    });

    // GET /api/mlb/series/active — unlocked series only (open for picks)
    app.get("/api/mlb/series/active", async (req, res) => {
        try {
            const series = await MlbSeries.findAll({
                where: { locked: false },
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load active series" });
        }
    });

    // GET /api/mlb/series/round/:round — all series for a specific round
    app.get("/api/mlb/series/round/:round", async (req, res) => {
        try {
            const series = await MlbSeries.findAll({
                where: { round: req.params.round },
                order: [["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load series for round" });
        }
    });

    // GET /api/mlb/series/live — in-progress and final series (for results display)
    app.get("/api/mlb/series/live", async (req, res) => {
        try {
            const series = await MlbSeries.findAll({
                where: {
                    status: ["STATUS_IN_PROGRESS", "STATUS_FINAL"],
                },
                order: [["round", "ASC"], ["series_slot", "ASC"]],
            });
            res.json(series);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load live series" });
        }
    });

    // GET /api/mlb/standings
    app.get("/api/mlb/standings", async (req, res) => {
        try {
            const [entries, series, tiebreakers, allPicks] = await Promise.all([
                MlbEntries.findAll(),
                MlbSeries.findAll(),
                MlbTiebreaker.findAll(),
                MlbPicks.findAll()
            ]);

            const seriesMap = {};
            series.forEach(s => seriesMap[s.id] = s);

            const tbMap = {};
            tiebreakers.forEach(t => tbMap[t.user_id] = t.total_points);

            const picksByUser = {};
            allPicks.forEach(p => {
                if (!picksByUser[p.user_id]) picksByUser[p.user_id] = [];
                picksByUser[p.user_id].push(p);
            });

            const TOTAL_TOURNAMENT_MAX = 160;

            const standings = entries.map(entry => {
                const picks = picksByUser[entry.user_id] || [];
                let points = 0;
                let correct_series = 0;
                let correct_lengths = 0;
                let potential_lost = 0;

                for (const pick of picks) {
                    const s = seriesMap[pick.series_id];
                    if (!s) continue;

                    const base = pick.confidence;
                    const maxForThisSeries = base * 2;
                    const homeWins = s.home_wins || 0;
                    const awayWins = s.away_wins || 0;
                    const totalPlayed = homeWins + awayWins;

                    if (s.winner) {
                        if (pick.pick === s.winner) {
                            const isPerfect = pick.series_length_guess === s.series_length;
                            const earned = isPerfect ? maxForThisSeries : base;

                            points += earned;
                            correct_series += 1;
                            if (isPerfect) correct_lengths += 1;

                            if (!isPerfect) {
                                potential_lost += (maxForThisSeries - base);
                            }
                        } else {
                            potential_lost += maxForThisSeries;
                        }
                    } else {
                        const hWins = Number(s.home_wins || 0);
                        const aWins = Number(s.away_wins || 0);
                        const totalPlayed = hWins + aWins;
                        const userLengthGuess = Number(pick.series_length_guess || 4);

                        const pickedTeam = String(pick.pick || "").trim().toLowerCase();
                        const homeTeamName = String(s.home_team || "").trim().toLowerCase();
                        const awayTeamName = String(s.away_team || "").trim().toLowerCase();

                        const pickedTeamLost = (pickedTeam === homeTeamName && awayWins === 4) ||
                            (pickedTeam === awayTeamName && hWins === 4);

                        const currentWinsForPickedTeam = (pickedTeam === homeTeamName) ? hWins : aWins;
                        const winsNeeded = 4 - currentWinsForPickedTeam;

                        const earliestPossibleWinForUser = totalPlayed + winsNeeded;
                        const lengthImpossible = earliestPossibleWinForUser > userLengthGuess;

                        if (pickedTeamLost) {
                            potential_lost += maxForThisSeries;
                        } else if (lengthImpossible) {
                            potential_lost += (maxForThisSeries - base);
                        }
                    }
                }

                return {
                    entry_name: entry.entry_name,
                    user_id: entry.user_id,
                    points,
                    correct_series,
                    correct_lengths,
                    max_possible: TOTAL_TOURNAMENT_MAX - potential_lost,
                    tiebreaker: tbMap[entry.user_id] ?? null,
                };
            });

            standings.sort((a, b) =>
                b.points - a.points ||
                b.max_possible - a.max_possible ||
                b.correct_series - a.correct_series
            );

            let rank = 1;
            for (let i = 0; i < standings.length; i++) {
                if (i > 0 && standings[i].points < standings[i - 1].points) rank = i + 1;
                standings[i].rank = rank;
            }

            res.json(standings);
        } catch (err) {
            console.error("[Standings API Error]:", err);
            res.status(500).json({ error: "Failed to calculate standings" });
        }
    });

    // GET /api/mlb/tiebreaker — get a user's tiebreaker
    app.get("/api/mlb/tiebreaker", requireAuth, async (req, res) => {
        try {
            const entry = await MlbEntries.findOne({ where: { user_id: req.user.id } });
            if (!entry) return res.json(null);
            const record = await MlbTiebreaker.findOne({ where: { user_id: entry.user_id } });
            res.json(record || null);
        } catch (err) {
            res.status(500).json({ error: "Failed to load tiebreaker" });
        }
    });

    // POST /api/mlb/tiebreaker — save tiebreaker
    app.post("/api/mlb/tiebreaker", requireAuth, async (req, res) => {
        try {
            const finals = await MlbSeries.findOne({ where: { round: 4 } });
            if (finals && finals.status !== "STATUS_SCHEDULED") {
                return res.status(403).json({ error: "Tiebreaker is locked — Finals has started" });
            }

            const { total_points } = req.body;
            if (!total_points || isNaN(parseInt(total_points))) {
                return res.status(400).json({ error: "total_points must be a number" });
            }

            await MlbTiebreaker.upsert({
                user_id: req.user.id,
                total_points: parseInt(total_points),
            });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to save tiebreaker" });
        }
    });

    // GET /api/mlb/tiebreaker/all — all tiebreakers
    app.get("/api/mlb/tiebreaker/all", async (req, res) => {
        try {
            const entries = await MlbEntries.findAll();
            const tiebreakers = await MlbTiebreaker.findAll();
            const tbMap = {};
            for (const t of tiebreakers) tbMap[t.user_id] = t.total_points;
            const result = entries.map(e => ({
                entry_name: e.entry_name,
                total_points: tbMap[e.user_id] ?? null,
            }));
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "Failed to load tiebreakers" });
        }
    });
};