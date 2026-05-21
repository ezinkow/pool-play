const nbaDb = require("../../models");
const { NbaPicks, NbaSeries, NbaEntries } = nbaDb;
const requireAuth = require("../../middleware/Requireauth");

const ROUND_CONFIG = {
    1: { label: "R1", maxPoints: 32 },
    2: { label: "R2", maxPoints: 24 },
    3: { label: "R3", maxPoints: 16 },
    4: { label: "Finals", maxPoints: 8 },
};

module.exports = function (app) {

    // GET /api/nba/picks?name=X
    app.get("/api/nba/picks", async (req, res) => {
        try {
            const { name } = req.query;

            if (!name || name === "undefined" || name === "SELECT YOUR NAME") {
                return res.json([]);
            }

            const entry = await NbaEntries.findOne({ where: { entry_name: name } });
            if (!entry) return res.json([]);

            const picks = await NbaPicks.findAll({
                where: { user_id: entry.user_id },
                include: [{
                    model: NbaSeries,
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

    // POST /api/nba/picks/bulk
    app.post("/api/nba/picks/bulk", requireAuth, async (req, res) => {
        try {
            const { picks } = req.body;
            if (!Array.isArray(picks) || picks.length === 0) {
                return res.status(400).json({ error: "No picks provided" });
            }

            const entry = await NbaEntries.findOne({ where: { user_id: req.user.id } });
            if (!entry) return res.status(403).json({ error: "Join the pool first!" });

            // 1. Fetch series details for the incoming picks
            const seriesIds = picks.map(p => p.series_id);
            const seriesInDb = await NbaSeries.findAll({ where: { id: seriesIds } });

            // 2. GROUP picks by round so we validate them independently
            const picksByRound = {};

            seriesInDb.forEach(s => {
                if (!picksByRound[s.round]) {
                    picksByRound[s.round] = {
                        config: ROUND_CONFIG[s.round],
                        totalPoints: 0,
                        label: s.round_label
                    };
                }

                // Find the submitted pick data for this series
                const pickData = picks.find(p => p.series_id === s.id);
                if (pickData) {
                    picksByRound[s.round].totalPoints += (parseInt(pickData.confidence) || 0);
                }
            });

            // 3. VALIDATE each round independently
            for (const rNum in picksByRound) {
                const round = picksByRound[rNum];
                if (round.totalPoints > round.config.maxPoints) {
                    return res.status(400).json({
                        error: `Total points (${round.totalPoints}) exceeds ${round.label} Max (${round.config.maxPoints})`
                    });
                }
            }

            // 4. SMART LOCK CHECK
            const lockedSeriesInDb = seriesInDb.filter(s => s.locked);
            const existingPicks = await NbaPicks.findAll({ where: { user_id: req.user.id } });

            for (const submittedPick of picks) {
                const isLocked = lockedSeriesInDb.some(ls => ls.id === submittedPick.series_id);

                if (isLocked) {
                    const currentPickInDb = existingPicks.find(ep => ep.series_id === submittedPick.series_id);

                    // If the series is locked, check if the NEW data is different from the OLD data
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
                await NbaPicks.upsert({
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

    // GET /api/nba/picks/all (For the Group Matrix / Standings)
    app.get("/api/nba/picks/all", async (req, res) => {
        try {
            const picks = await NbaPicks.findAll({
                include: [{
                    model: NbaSeries,
                    as: 'series',
                    attributes: [
                        "id", "round", "round_label", "locked",
                        "home_team", "away_team", "home_seed", "away_seed",
                        "home_wins", "away_wins", "winner", "series_length", "status"
                    ],
                }],
            });

            const entries = await NbaEntries.findAll();
            const entryMap = {};
            entries.forEach(e => { entryMap[e.user_id] = e.entry_name; });

            const result = picks
                .filter(p => p.series?.locked) // Only show picks for locked games to prevent cheating
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
};