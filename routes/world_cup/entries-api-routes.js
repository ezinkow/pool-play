const { WorldCupEntries, Users } = require("../../models");
const requireAuth = require("../../middleware/Requireauth");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Profile Status (Matches: /api/worldcup/entries/me)
    // ------------------------------------------------------------------
    app.get("/api/worldcup/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await WorldCupEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("❌ Error fetching entry status:", err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // ------------------------------------------------------------------
    // 2. POST Create/Initialize Profile Entry (Matches: /api/worldcup/entries)
    // ------------------------------------------------------------------
    app.post("/api/worldcup/entries", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            // Check if display name is taken by someone else
            const nameTaken = await WorldCupEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const [entry, created] = await WorldCupEntries.findOrCreate({
                where: { user_id: req.user.id },
                defaults: { entry_name },
            });

            res.json({ success: true, created, entry_name: entry.entry_name });
        } catch (err) {
            console.error("Entry creation error:", err);
            res.status(500).json({ error: "Failed to join the pool" });
        }
    });

    // ------------------------------------------------------------------
    // 3. GET All Entries (Matches global fetches for admin/debug)
    // ------------------------------------------------------------------
    app.get("/api/worldcup/entries", async (req, res) => {
        try {
            const entries = await WorldCupEntries.findAll({
                attributes: ["id", "user_id", "entry_name", "createdAt"],
            });
            res.json(entries);
        } catch (err) {
            res.status(500).json({ error: "Failed to load entries" });
        }
    });

    // ------------------------------------------------------------------
    // OPTIONAL: Legacy Check Route (Kept for backwards compatibility)
    // ------------------------------------------------------------------
    app.get("/api/worldcup/entries/check/:name", async (req, res) => {
        try {
            const UserModel = Users || db.Users || db.user;
            const user = await UserModel.findOne({ where: { name: req.params.name } });
            if (!user) return res.json({ exists: false });
            const entry = await WorldCupEntries.findOne({ where: { user_id: user.id } });
            res.json({ exists: !!entry });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Check failed" });
        }
    });
};