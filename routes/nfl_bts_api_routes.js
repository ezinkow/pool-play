const { NflBtsTeamAssignments, NflBtsGames, NflBtsPicks, NflBtsEntries, NflBtsTeams, Users } = require("../models");
const db = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");

module.exports = function (app) {

    // ------------------------------------------------------------------
    // 1. GET Current User's Profile Status (Matches: /api/nfl_bts/entries/me)
    // ------------------------------------------------------------------
    app.get("/api/nfl_bts/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await NflBtsEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("❌ Error fetching entry status:", err);
            res.status(500).json({ error: "Check failed" });
        }
    });

    // ------------------------------------------------------------------
    // 2. POST Create/Initialize Profile Entry (Matches: /api/nfl_bts/entries)
    // ------------------------------------------------------------------
    app.post("/api/nfl_bts/entries/create", requireAuth, async (req, res) => {
        try {
            const entry_name = (req.body.entry_name || req.user.name).trim();

            if (!entry_name) {
                return res.status(400).json({ error: "Entry name is required" });
            }

            const nameTaken = await NflBtsEntries.findOne({ where: { entry_name } });
            if (nameTaken && nameTaken.user_id !== req.user.id) {
                return res.status(400).json({ error: "That display name is already taken" });
            }

            const [entry, created] = await NflBtsEntries.findOrCreate({
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
    app.get("/api/nfl_bts/entries", async (req, res) => {
        try {
            const entries = await NflBtsEntries.findAll({
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
    const handleLegacyCheck = async (req, res) => {
        try {
            const user = await Users.findOne({ where: { name: req.params.name } });
            if (!user) return res.json({ exists: false });
            const entry = await NflBtsEntries.findOne({ where: { user_id: user.id } });
            res.json({ exists: !!entry });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Check failed" });
        }
    };
    app.get("/api/nfl_bts/entries/check/:name", handleLegacyCheck);
    app.get("/api/nfl_bts/entries/check/:name", handleLegacyCheck);

    // --------------------------------------------------------
    // GET /api/nfl_bts/assignment
    // Fetch the logged-in user's team assignment, logo, and colors
    // --------------------------------------------------------
    app.get("/api/nfl_bts/assignment", requireAuth, async (req, res) => {
        try {
            const assignment = await NflBtsTeamAssignments.findOne({
                where: { user_id: req.user.id }
            });

            if (!assignment || !assignment.team_name) {
                return res.json({ team_name: null, logo: null, primary_color: null, secondary_color: null });
            }

            // Fetch official branding from NflBtsTeams table using the assigned team name
            const teamMeta = await db.NflBtsTeams.findOne({
                where: { name: assignment.team_name }
            });

            res.json({
                team_name: assignment.team_name,
                logo: teamMeta ? teamMeta.logo : null,
                primary_color: teamMeta ? teamMeta.primary_color : null,
                secondary_color: teamMeta ? teamMeta.secondary_color : null
            });
        } catch (err) {
            console.error("Error fetching assignment branding:", err);
            res.status(500).json({ error: "Failed to fetch assignment" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/matchup
    // Fetch the specific game for the user's assigned team for a given week
    // --------------------------------------------------------
    app.get("/api/nfl_bts/matchup", requireAuth, async (req, res) => {
        try {
            const { week, team } = req.query;
            // Swapped to NflBtsGames (Schedule/Matchup data)
            const matchup = await NflBtsGames.findOne({
                where: {
                    week: parseInt(week),
                    [Op.or]: [{ home_team: team }, { away_team: team }]
                }
            });
            res.json(matchup || null);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch matchup" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/picks
    // Fetch the user's existing pick for a specific week
    // --------------------------------------------------------
    app.get("/api/nfl_bts/picks", requireAuth, async (req, res) => {
        try {
            const { week } = req.query;
            // Swapped to NflBtsPicks (User's pick data)
            const pick = await NflBtsPicks.findOne({
                where: { user_id: req.user.id, week: parseInt(week) }
            });
            res.json(pick || null);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch pick" });
        }
    });

    // --------------------------------------------------------
    // POST /api/nfl_bts/picks
    // Save/Update the user's ATS and O/U picks (Enforces Kickoff Lock)
    // --------------------------------------------------------
    app.post("/api/nfl_bts/picks", requireAuth, async (req, res) => {
        try {
            const { week, team_name, ats_pick, ou_pick } = req.body;

            // 1. Find the matchup to verify kickoff time (NflBtsGames)
            const matchup = await NflBtsGames.findOne({
                where: {
                    week: parseInt(week),
                    [Op.or]: [{ home_team: team_name }, { away_team: team_name }]
                }
            });

            if (!matchup) return res.status(404).json({ error: "Matchup not found." });

            // 2. Exact Kickoff Lock Enforcement
            if (new Date() >= new Date(matchup.game_date)) {
                return res.status(403).json({ error: "This game has already kicked off. Picks are locked." });
            }

            // 3. Upsert the pick (NflBtsPicks)
            let pick = await NflBtsPicks.findOne({
                where: { user_id: req.user.id, week: parseInt(week) }
            });

            if (pick) {
                await pick.update({ ats_pick, ou_pick });
            } else {
                await NflBtsPicks.create({
                    user_id: req.user.id,
                    week: parseInt(week),
                    team_name,
                    ats_pick,
                    ou_pick
                });
            }

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to save pick" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/matrix
    // --------------------------------------------------------
    app.get("/api/nfl_bts/matrix", requireAuth, async (req, res) => {
        try {
            const { week } = req.query;

            const query = `
                SELECT 
                    u.user_id as user_id,
                    u.entry_name as user_name,
                    fa.team_name,
                    ft.logo,
                    fm.home_team,
                    fm.away_team,
                    fm.adjusted_spread,
                    fm.over_under,
                    fm.game_date,
                    fp.ats_pick,
                    fp.ou_pick,
                    fp.ats_status as status,
                    fm.home_logo,
                    fm.away_logo
                FROM nfl_bts_team_assignments fa
                JOIN nfl_bts_entries u ON fa.user_id = u.user_id
                LEFT JOIN nfl_bts_teams ft ON ft.name = fa.team_name
                LEFT JOIN nfl_bts_games fm 
                    ON fm.week = :week 
                    AND (fm.home_team = fa.team_name OR fm.away_team = fa.team_name)
                LEFT JOIN nfl_bts_picks fp 
                    ON fp.user_id = fa.user_id 
                    AND fp.week = :week
                ORDER BY u.entry_name ASC;
            `;

            const [results] = await db.sequelize.query(query, {
                replacements: { week: parseInt(week) }
            });

            res.json(results);
        } catch (err) {
            console.error("Matrix route error:", err);
            res.status(500).json({ error: "Failed to fetch matrix" });
        }
    });

    // --------------------------------------------------------
    // GET /api/nfl_bts/standings
    // --------------------------------------------------------
    app.get("/api/nfl_bts/standings", requireAuth, async (req, res) => {
        try {
            const query = `
            SELECT 
                fa.user_id,
                u.entry_name as user_name,
                fa.team_name,
                fa.division,
                t.logo,
                SUM(CASE WHEN fp.ats_status = 'win' THEN 1 ELSE 0 END) as ats_wins,
                SUM(CASE WHEN fp.ats_status = 'loss' THEN 1 ELSE 0 END) as ats_losses,
                SUM(CASE WHEN fp.ats_status = 'push' THEN 1 ELSE 0 END) as ats_pushes,
                SUM(CASE WHEN fp.ou_status = 'win' THEN 1 ELSE 0 END) as ou_wins,
                SUM(CASE WHEN fp.ou_status = 'loss' THEN 1 ELSE 0 END) as ou_losses,
                SUM(CASE WHEN fp.ou_status = 'push' THEN 1 ELSE 0 END) as ou_pushes
            FROM nfl_bts_team_assignments fa
            JOIN nfl_bts_entries u ON fa.user_id = u.user_id
            LEFT JOIN nfl_bts_teams t ON fa.team_name = t.name
            LEFT JOIN nfl_bts_picks fp ON fa.user_id = fp.user_id
            GROUP BY fa.user_id, u.entry_name, fa.team_name, fa.division, t.logo
            ORDER BY fa.division ASC, ats_wins DESC, ou_wins DESC;
        `;

            const [results] = await db.sequelize.query(query);
            res.json(results);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

};