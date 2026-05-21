const { NbaTiebreaker, NbaSeries, NbaEntries } = require("../../models");
const requireAuth = require("../../middleware/Requireauth");

module.exports = function (app) {

    // GET /api/nba/tiebreaker?name=X — get a user's tiebreaker
    app.get("/api/nba/tiebreaker", async (req, res) => {
        try {
            const { name } = req.query;
            const entry = await NbaEntries.findOne({ where: { entry_name: name } });
            if (!entry) return res.json(null);
            const record = await NbaTiebreaker.findOne({ where: { user_id: entry.user_id } });
            res.json(record || null);
        } catch (err) {
            res.status(500).json({ error: "Failed to load tiebreaker" });
        }
    });

    // POST /api/nba/tiebreaker — save tiebreaker (auth required, locks when Finals tips)
    app.post("/api/nba/tiebreaker", requireAuth, async (req, res) => {
        try {
            // Lock tiebreaker once the Finals series is no longer scheduled
            const finals = await NbaSeries.findOne({ where: { round: 4 } });
            if (finals && finals.status !== "STATUS_SCHEDULED") {
                return res.status(403).json({ error: "Tiebreaker is locked — Finals has started" });
            }

            const { total_points } = req.body;
            if (!total_points || isNaN(parseInt(total_points))) {
                return res.status(400).json({ error: "total_points must be a number" });
            }

            await NbaTiebreaker.upsert({
                user_id:      req.user.id,
                total_points: parseInt(total_points),
            });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to save tiebreaker" });
        }
    });

    // GET /api/nba/tiebreaker/all — all tiebreakers (for group display)
    app.get("/api/nba/tiebreaker/all", async (req, res) => {
        try {
            const entries     = await NbaEntries.findAll();
            const tiebreakers = await NbaTiebreaker.findAll();
            const tbMap = {};
            for (const t of tiebreakers) tbMap[t.user_id] = t.total_points;
            const result = entries.map(e => ({
                entry_name:   e.entry_name,
                total_points: tbMap[e.user_id] ?? null,
            }));
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "Failed to load tiebreakers" });
        }
    });
};