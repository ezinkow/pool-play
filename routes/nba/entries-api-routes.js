const { NbaEntries, Users } = require("../../models");
const requireAuth = require("../../middleware/Requireauth");

module.exports = function (app) {

    // GET /api/nba/entries/check/:name
    app.get("/api/nba/entries/check/:name", async (req, res) => {
        try {
            const user = await Users.findOne({ where: { name: req.params.name } });
            if (!user) return res.json({ exists: false });
            const entry = await NbaEntries.findOne({ where: { user_id: user.id } });
            res.json({ exists: !!entry });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // POST /api/nba/entries/create
    app.post("/api/nba/entries/create", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            // Check if display name is taken by someone else
            const nameTaken = await NbaEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const [entry, created] = await NbaEntries.findOrCreate({
                where: { user_id: req.user.id },
                defaults: { entry_name },
            });

            res.json({ success: true, created, entry_name: entry.entry_name });
        } catch (err) {
            console.error("Entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // GET /api/nba/entries
    app.get("/api/nba/entries", async (req, res) => {
        try {
            const entries = await NbaEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            res.status(500).json({ error: "Failed to load entries" });
        }
    });
};