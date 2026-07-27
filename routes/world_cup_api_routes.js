const { WorldCupEntries, Users } = require("../models");
const requireAuth = require("../middleware/Requireauth");

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
    app.post("/api/worldcup/entries/create", requireAuth, async (req, res) => {
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

    app.get("/api/worldcup/countries", async (req, res) => {
        const countries = await db.WorldCupCountryInfo.findAll();
        res.json(countries);
    });

    app.get("/api/worldcup/gamestates", async (req, res) => {
        try {
            const state = await WorldCupGameStates.findOne({
                order: [["id", "DESC"]],
            });

            res.json(state);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load game state" });
        }
    });

    // ----------------------------------
    // GET all matches (The Schedule)
    // ----------------------------------
    app.get("/api/worldcup/matches", async (req, res) => {
        try {
            const matches = await WorldCupMatches.findAll({
                order: [["game_date", "ASC"]]
            });
            res.json(matches);
        } catch (err) {
            console.error("❌ Matches GET Error:", err);
            res.status(500).json(err);
        }
    });

    // ----------------------------------
    // GET all picks from all players (For Matrix Grid)
    // ----------------------------------
    app.get("/api/worldcup/picks/all", async (req, res) => {
        try {
            const allPicks = await WorldCupPicks.findAll({
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

            const rows = await WorldCupPicks.findAll({
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
            await WorldCupPicks.destroy({
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
            const created = await WorldCupPicks.bulkCreate(pickEntries);

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

            // 2. Clear old bracket picks using your correct Model name (WorldCupPicks)
            // Maps match_id to your database table column key name
            if (knockoutMatchIds.length > 0) {
                await WorldCupPicks.destroy({
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
                await WorldCupPicks.bulkCreate(recordsToInsert, { transaction });
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

    // --standings
    app.get("/api/worldcup/standings", async (req, res) => {
        try {
            const EntryModel = db.WorldCupEntries || db.world_cup_entries;
            const PicksModel = db.WorldCupPicks || db.world_cup_picks;
            const MatchesModel = db.WorldCupMatches || db.world_cup_matches;
            const CountryModel = db.WorldCupCountryInfo;

            const entries = await EntryModel.findAll({ attributes: ["user_id", "entry_name"] });
            const allPicks = await PicksModel.findAll({ include: [{ model: MatchesModel, as: "match" }] });

            // Fetch all countries once to map names to flags efficiently
            const countries = await CountryModel.findAll();
            const countryMap = new Map(countries.map(c => [c.name.trim().toLowerCase(), c.flag_url]));

            const picksByUser = allPicks.reduce((acc, pick) => {
                if (!acc[pick.user_id]) acc[pick.user_id] = [];
                acc[pick.user_id].push(pick);
                return acc;
            }, {});

            const standingsMap = new Map();
            const CHAMP_MATCH_ID = "760517";

            entries.forEach(entry => {
                const uid = entry.user_id;
                standingsMap.set(uid, {
                    id: uid,
                    name: entry.entry_name,
                    group_points: 0,
                    bracket_points: 0,
                    points: 0,
                    champion_pick: "TBD",
                    champion_logo: null
                });

                const stats = standingsMap.get(uid);
                const userPicks = picksByUser[uid] || [];
                const matchedMatchIds = new Set();

                userPicks.forEach(pick => {
                    const match = pick.match;
                    if (!match) return;

                    // 1. Identify Champion Pick using the new CountryModel
                    if (String(pick.match_id) === CHAMP_MATCH_ID) {
                        stats.champion_pick = pick.selection;
                        // Look up the flag from our new table
                        stats.champion_logo = countryMap.get(pick.selection?.trim().toLowerCase()) || null;
                    }

                    // 2. Points Logic
                    // Replace your existing Points Logic block with this:
                    if (["STATUS_FULL_TIME", "STATUS_FINAL", "FINAL", "STATUS_FINAL_PEN", "STATUS_FINAL_AET"].includes(match.status)) {
                        if (matchedMatchIds.has(match.match_id)) return;

                        let isCorrect = false;
                        let pts = 0;

                        if (parseInt(match.round) === 0) {
                            // GROUP STAGE: Selection is "Home", "Away", or "Draw"
                            isCorrect = pick.selection?.trim().toLowerCase() === match.result?.trim().toLowerCase();
                            pts = (match.result?.toLowerCase() === "draw") ? (match.draw_points_value || 2) : (match.points_value || 1);
                        } else {
                            // KNOCKOUT: Selection is "Spain", "Brazil", etc.
                            // We resolve the actual winner name from the database match record
                            const winnerName = (match.result?.trim().toLowerCase() === "home")
                                ? match.home_team?.trim().toLowerCase()
                                : match.away_team?.trim().toLowerCase();

                            isCorrect = pick.selection?.trim().toLowerCase() === winnerName;
                            pts = match.points_value || 2; // Bracket point value
                        }

                        if (isCorrect) {
                            matchedMatchIds.add(match.match_id);
                            if (parseInt(match.round) === 0) stats.group_points += pts;
                            else stats.bracket_points += pts;
                            stats.points += pts;
                        }
                    }
                });
            });

            res.json(Array.from(standingsMap.values()).sort((a, b) => b.points - a.points));
        } catch (err) {
            console.error("❌ Standings Error:", err);
            res.status(500).json({ error: "Failed to calculate standings" });
        }
    });







};

