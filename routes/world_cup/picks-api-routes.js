const { WorldCupMatches, WorldCupMatchPicks, WorldCupEntries } = require("../../models");

module.exports = function (app) {

    // ----------------------------------
    // GET all picks from all players (For Matrix Grid)
    // ----------------------------------
    app.get("/api/worldcup/picks/all", async (req, res) => {
        try {
            const allPicks = await WorldCupMatchPicks.findAll({
                include: [{
                    model: WorldCupEntries,
                    attributes: ["entry_name"]
                }]
            });

            const formattedPicks = allPicks.map(p => {
                const associatedEntry = p.WorldCupEntry
                    || p.world_cup_entry
                    || p.WorldCupEntries
                    || p.world_cup_entries;

                return {
                    id: p.id,
                    match_id: p.match_id,
                    user_id: p.user_id, // Pure integer mapping key
                    name: associatedEntry?.entry_name || `User ${p.user_id}`, // Used strictly for text display
                    selection: p.selection
                };
            });

            res.json(formattedPicks);
        } catch (err) {
            console.error("❌ Error fetching global matrix picks:", err);
            res.status(500).json({ error: "Failed to fetch matrix data." });
        }
    });

    // ----------------------------------
    // GET my picks (For Single Logged In User)
    // ----------------------------------
    app.get("/api/worldcup/picks", async (req, res) => {
        try {
            const { user_id } = req.query;
            if (!user_id) return res.status(400).json({ error: "Missing user_id" });

            const rows = await WorldCupMatchPicks.findAll({
                where: { user_id }
            });
            res.json(rows);
        } catch (err) {
            console.error("❌ Single Picks GET Error:", err);
            res.status(500).json({ error: "Failed to fetch picks" });
        }
    });

    // ----------------------------------
    // POST match picks (Bulk Update)
    // ----------------------------------
    app.post("/api/worldcup/picks", async (req, res) => {
        try {
            const { user_id, picks } = req.body;

            if (!user_id || !picks || !Array.isArray(picks)) {
                return res.status(400).json({ error: "Missing user_id or picks array" });
            }

            // 1. Get the list of match IDs being updated to clear previous entries
            const matchIds = picks.map(p => p.match_id);

            // 2. Delete existing picks for these specific matches to prevent duplicates
            await WorldCupMatchPicks.destroy({
                where: {
                    user_id,
                    match_id: matchIds
                }
            });

            // 3. Map to model columns
            const pickEntries = picks.map(p => ({
                user_id: user_id,
                match_id: p.match_id,
                selection: p.selection
            }));

            // 4. Insert the new selections
            const created = await WorldCupMatchPicks.bulkCreate(pickEntries);

            res.json({ success: true, createdCount: created.length });
        } catch (err) {
            console.error("❌ Match Picks Post Error:", err);
            res.status(500).json(err);
        }
    });

    app.post("/api/worldcup/picks/bracket", async (req, res) => {
        // FIX 1: Expect user_id instead of a username string
        const { user_id, picks } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "Missing required parameter: user_id" });
        }
        if (!picks || !Array.isArray(picks)) {
            return res.status(400).json({ error: "Picks payload must be a valid array" });
        }

        // FIX 2: Dynamic fallback reference to prevent sequelize context crashes
        const activeSequelizeInstance = WorldCupMatches.sequelize;
        const transaction = await activeSequelizeInstance.transaction();

        try {
            // 1. Gather all active knockout match IDs
            const knockoutMatches = await WorldCupMatches.findAll({
                where: {
                    round: [1, 2, 3, 4, 5, 6]
                },
                attributes: ["match_id"],
                transaction
            });

            const knockoutMatchIds = knockoutMatches.map(m => m.match_id);

            // 2. Clear old bracket picks using your correct Model name (WorldCupMatchPicks)
            // Maps match_id to your database table column key name
            if (knockoutMatchIds.length > 0) {
                await WorldCupMatchPicks.destroy({
                    where: {
                        user_id: user_id,
                        match_id: knockoutMatchIds
                    },
                    transaction
                });
            }

            // 3. Map to match your standard model properties: user_id, match_id, selection
            const recordsToInsert = picks
                .filter(p => knockoutMatchIds.includes(String(p.game_id)) && p.pick && p.pick !== "TBD")
                .map(p => ({
                    user_id: user_id,
                    match_id: p.game_id,
                    selection: p.pick
                }));

            // 4. Bulk insert matches seamlessly
            if (recordsToInsert.length > 0) {
                await WorldCupMatchPicks.bulkCreate(recordsToInsert, { transaction });
            }

            await transaction.commit();

            return res.status(200).json({
                success: true,
                message: `Successfully synchronized ${recordsToInsert.length} bracket selections.`
            });

        } catch (error) {
            await transaction.rollback();
            console.error("❌ Failed to process knockout bracket transactional update:", error);
            return res.status(500).json({ error: "Internal server error saving bracket selections." });
        }
    });
};