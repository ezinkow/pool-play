const { HrdPlayers, HrdRosters, Users } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const db = require("../models");

module.exports = function (app) {

    // GET /api/hrd/players (Fetch eligible player pool)
    app.get("/api/hrd/players", requireAuth, async (req, res) => {
        try {
            const players = await HrdPlayers.findAll({
                order: [["salary", "DESC"]]
            });
            res.json(players);
        } catch (err) {
            console.error("Error fetching HRD players:", err);
            res.status(500).json({ error: "Failed to load player pool" });
        }
    });

    // GET /api/hrd/roster/me (Fetch user's current 12-player roster)
    app.get("/api/hrd/roster/me", requireAuth, async (req, res) => {
        try {
            const roster = await HrdRosters.findAll({
                where: { user_id: req.user.id },
                include: [{ model: HrdPlayers }]
            });
            res.json(roster);
        } catch (err) {
            console.error("Error fetching user roster:", err);
            res.status(500).json({ error: "Failed to load roster" });
        }
    });

    // POST /api/hrd/roster/save (Save 12 players within 300 salary cap)
    app.post("/api/hrd/roster/save", requireAuth, async (req, res) => {
        try {
            const { playerIds } = req.body; // Array of 12 player IDs

            if (!Array.isArray(playerIds) || playerIds.length !== 12) {
                return res.status(400).json({ error: "You must select exactly 12 players for your roster." });
            }

            // Verify players and calculate total salary
            const players = await HrdPlayers.findAll({
                where: { id: { [Op.in]: playerIds } }
            });

            if (players.length !== 12) {
                return res.status(400).json({ error: "One or more selected players are invalid or ineligible." });
            }

            const totalSalary = players.reduce((sum, p) => sum + p.salary, 0);
            if (totalSalary > 300) {
                return res.status(400).json({ error: `Salary cap exceeded! Total salary is ${totalSalary} (Max allowed: 300).` });
            }

            // Replace user's roster
            await HrdRosters.destroy({ where: { user_id: req.user.id } });

            const newRosterEntries = playerIds.map(pid => ({
                user_id: req.user.id,
                player_id: pid
            }));

            await HrdRosters.bulkCreate(newRosterEntries);

            res.json({ success: true, message: "Roster saved successfully!", totalSalary });
        } catch (err) {
            console.error("Error saving roster:", err);
            res.status(500).json({ error: "Failed to save roster" });
        }
    });

    // GET /api/hrd/standings (Full season & bench logic calculation)
    app.get("/api/hrd/standings", requireAuth, async (req, res) => {
        try {
            const query = `
                SELECT 
                    u.id as user_id,
                    u.name as username,
                    u.real_name,
                    GROUP_CONCAT(p.name ORDER BY p.hr_2026 ASC) as player_names,
                    SUM(p.hr_2026) as total_hrs_raw,
                    MIN(p.hr_2026) as lowest_hr_player_count
                FROM users u
                JOIN hrd_rosters r ON u.id = r.user_id
                JOIN hrd_players p ON r.player_id = p.id
                GROUP BY u.id, u.name, u.real_name
            `;

            const [results] = await db.sequelize.query(query);

            // Apply bench rule: subtract the lowest HR player from the total
            const standings = results.map(row => {
                const adjustedTotal = row.total_hrs_raw - row.lowest_hr_player_count;
                return {
                    ...row,
                    adjusted_total: adjustedTotal
                };
            }).sort((a, b) => b.adjusted_total - a.adjusted_total);

            res.json(standings);
        } catch (err) {
            console.error("Error fetching standings:", err);
            res.status(500).json({ error: "Failed to load standings" });
        }
    });

    // GET /api/hrd/all-teams (Fetch all user rosters for viewing)
    app.get("/api/hrd/all-teams", requireAuth, async (req, res) => {
        try {
            const rosters = await HrdRosters.findAll({
                include: [
                    { model: Users, attributes: ["id", "name", "real_name"] },
                    { model: HrdPlayers }
                ]
            });

            // Group by user
            const userMap = {};
            rosters.forEach(r => {
                if (!r.User) return;
                const uid = r.User.id;
                if (!userMap[uid]) {
                    userMap[uid] = {
                        user_id: uid,
                        username: r.User.name,
                        real_name: r.User.real_name,
                        players: []
                    };
                }
                if (r.HrdPlayer) {
                    userMap[uid].players.push(r.HrdPlayer);
                }
            });

            res.json(Object.values(userMap));
        } catch (err) {
            console.error("Error fetching all teams:", err);
            res.status(500).json({ error: "Failed to load pool teams" });
        }
    });

    // GET /api/hrd/standings/monthly?month=4
    app.get("/api/hrd/standings/monthly", requireAuth, async (req, res) => {
        try {
            const monthParam = req.query.month || "4";

            // Map month number to column name
            const monthColumnMap = {
                "4": "hr_april",
                "5": "hr_may",
                "6": "hr_june",
                "7": "hr_july",
                "8": "hr_august",
                "9": "hr_september"
            };

            const targetColumn = monthColumnMap[monthParam] || "hr_april";

            const query = `
                SELECT 
                    u.id as user_id,
                    u.name as username,
                    u.real_name,
                    SUM(p.${targetColumn}) as total_hrs
                FROM users u
                JOIN hrd_rosters r ON u.id = r.user_id
                JOIN hrd_players p ON r.player_id = p.id
                GROUP BY u.id, u.name, u.real_name
                ORDER BY total_hrs DESC
            `;

            const [results] = await db.sequelize.query(query);
            res.json(results);
        } catch (err) {
            console.error("Error loading monthly standings:", err);
            res.status(500).json({ error: "Failed to load monthly standings" });
        }
    });

    // GET /api/hrd/entry/me — Check if user has joined the HRD pool
    app.get("/api/hrd/entry/me", requireAuth, async (req, res) => {
        try {
            // If you store pool entry registration in a separate table or check rosters:
            // For example, checking if they have any roster or an explicit entry table.
            // Let's assume you check HrdRosters or an HrdEntries table. Here we check if they have a roster:
            const rosterCount = await HrdRosters.count({ where: { user_id: req.user.id } });
            // Or if you want a dedicated entry table, you can create one. For simplicity, 
            // if they have saved players or we track entries:

            // Let's look up if they have an entry record (or simulate based on roster/entries)
            res.json({ entry: rosterCount > 0 ? { entry_name: req.user.name } : null });
        } catch (err) {
            console.error("Error fetching entry:", err);
            res.status(500).json({ error: "Failed to fetch entry" });
        }
    });

    // POST /api/hrd/entry/create — Join the pool
    app.post("/api/hrd/entry/create", requireAuth, async (req, res) => {
        try {
            const { entry_name } = req.body;
            // Simply acknowledge entry creation (or save to an entries table if you have one)
            res.json({ success: true, entry: { entry_name: entry_name || req.user.name } });
        } catch (err) {
            console.error("Error joining pool:", err);
            res.status(500).json({ error: "Failed to join pool" });
        }
    });

    // POST /api/hrd/entry/leave — Leave the pool
    app.post("/api/hrd/entry/leave", requireAuth, async (req, res) => {
        try {
            // Optional: clear their roster when leaving
            await HrdRosters.destroy({ where: { user_id: req.user.id } });
            res.json({ success: true });
        } catch (err) {
            console.error("Error leaving pool:", err);
            res.status(500).json({ error: "Failed to leave pool" });
        }
    });
};