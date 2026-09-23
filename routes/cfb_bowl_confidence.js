const { CfbBowlSeasonGames, CfbBowlPicks, CfbBowlEntries, CfbTeams, Users } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const db = require("../models");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/cfb_bowl_pickem/entries/me
    // --------------------------------------------------------
    const getEntryHandler = async (req, res) => {
        try {
            const entry = await CfbBowlEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("Error fetching bowl entry:", err);
            res.status(500).json({ error: "Failed to fetch entry" });
        }
    };
    app.get("/api/cfb_bowl_pickem/entries/me", requireAuth, getEntryHandler);

    // --------------------------------------------------------
    // POST /api/cfb_bowl_pickem/entries/create
    // --------------------------------------------------------
    const createEntryHandler = async (req, res) => {
        try {
            const { entry_name } = req.body;
            const finalName = entry_name?.trim() || req.user.name || "Player";

            let entry = await CfbBowlEntries.findOne({
                where: { user_id: req.user.id }
            });

            if (entry) {
                await entry.update({ entry_name: finalName });
            } else {
                entry = await CfbBowlEntries.create({
                    user_id: req.user.id,
                    entry_name: finalName
                });
            }

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Error creating bowl entry:", err);
            res.status(500).json({ error: "Failed to join pool" });
        }
    };
    app.post("/api/cfb_bowl_pickem/entries/create", requireAuth, createEntryHandler);

    // --------------------------------------------------------
    // POST /api/cfb_bowl_pickem/entries/leave
    // --------------------------------------------------------
    const leaveEntryHandler = async (req, res) => {
        try {
            await CfbBowlEntries.destroy({
                where: { user_id: req.user.id }
            });
            res.json({ success: true, message: "Successfully left pool." });
        } catch (err) {
            console.error("Error leaving bowl pool:", err);
            res.status(500).json({ error: "Failed to leave pool" });
        }
    };
    app.post("/api/cfb_bowl_pickem/entries/leave", requireAuth, leaveEntryHandler);

    // --------------------------------------------------------
    // GET /api/cfb_bowl_pickem (Fetch all bowl games & user picks)
    // --------------------------------------------------------
    app.get("/api/cfb_bowl_pickem", requireAuth, async (req, res) => {
        try {
            const games = await CfbBowlSeasonGames.findAll({
                order: [["game_date", "ASC"]]
            });

            const teamNames = new Set();
            games.forEach(g => {
                if (g.home_team) teamNames.add(g.home_team);
                if (g.away_team) teamNames.add(g.away_team);
            });

            const teamsData = await CfbTeams.findAll({
                where: { name: Array.from(teamNames) }
            });

            const teamColorMap = {};
            teamsData.forEach(t => {
                teamColorMap[t.name] = {
                    primaryColor: t.primary_color,
                    secondaryColor: t.secondary_color,
                    logo: t.logo
                };
            });

            const enhancedGames = games.map(g => {
                const gameJson = g.toJSON();
                const homeTeamMeta = teamColorMap[gameJson.home_team] || {};
                const awayTeamMeta = teamColorMap[gameJson.away_team] || {};

                return {
                    ...gameJson,
                    home_color: homeTeamMeta.primaryColor || gameJson.home_color,
                    home_secondary_color: homeTeamMeta.secondaryColor || gameJson.home_secondary_color,
                    home_logo: homeTeamMeta.logo || gameJson.home_logo,
                    away_color: awayTeamMeta.primaryColor || gameJson.away_color,
                    away_secondary_color: awayTeamMeta.secondaryColor || gameJson.away_secondary_color,
                    away_logo: awayTeamMeta.logo || gameJson.away_logo
                };
            });

            const userPicks = await CfbBowlPicks.findAll({
                where: { user_id: req.user.id }
            });

            const pickMap = {};
            userPicks.forEach(p => {
                pickMap[p.game_id] = {
                    picked_team: p.picked_team,
                    confidence_points: p.confidence_points,
                    status: p.status
                };
            });

            res.json({ games: enhancedGames, userPicks: pickMap });
        } catch (err) {
            console.error("Error fetching bowl matchups:", err);
            res.status(500).json({ error: "Failed to load bowl matchups" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_bowl_pickem/mypicks (Fetch user bowl picks & games)
    // --------------------------------------------------------
    app.get("/api/cfb_bowl_pickem/mypicks", requireAuth, async (req, res) => {
        try {
            const games = await CfbBowlSeasonGames.findAll({
                order: [["game_date", "ASC"]]
            });

            const teamNames = new Set();
            games.forEach(g => {
                if (g.home_team) teamNames.add(g.home_team);
                if (g.away_team) teamNames.add(g.away_team);
            });

            const teamsData = await CfbTeams.findAll({
                where: { name: Array.from(teamNames) }
            });

            const teamColorMap = {};
            teamsData.forEach(t => {
                teamColorMap[t.name] = {
                    primaryColor: t.primary_color,
                    secondaryColor: t.secondary_color,
                    logo: t.logo
                };
            });

            const enhancedGames = games.map(g => {
                const gameJson = g.toJSON();
                const homeTeamMeta = teamColorMap[gameJson.home_team] || {};
                const awayTeamMeta = teamColorMap[gameJson.away_team] || {};

                return {
                    ...gameJson,
                    home_color: homeTeamMeta.primaryColor || gameJson.home_color,
                    home_secondary_color: homeTeamMeta.secondaryColor || gameJson.home_secondary_color,
                    home_logo: homeTeamMeta.logo || gameJson.home_logo,
                    away_color: awayTeamMeta.primaryColor || gameJson.away_color,
                    away_secondary_color: awayTeamMeta.secondaryColor || gameJson.away_secondary_color,
                    away_logo: awayTeamMeta.logo || gameJson.away_logo
                };
            });

            const userPicks = await CfbBowlPicks.findAll({
                where: { user_id: req.user.id }
            });

            const pickMap = {};
            userPicks.forEach(p => {
                pickMap[p.game_id] = {
                    picked_team: p.picked_team,
                    confidence_points: p.confidence_points,
                    status: p.status
                };
            });

            res.json({ games: enhancedGames, userPicks: pickMap });
        } catch (err) {
            console.error("Error fetching bowl mypicks:", err);
            res.status(500).json({ error: "Failed to load bowl picks summary" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_teams (Fetch all CFB teams and colors)
    // --------------------------------------------------------
    app.get("/api/cfb_teams", requireAuth, async (req, res) => {
        try {
            const teams = await CfbTeams.findAll({
                order: [["name", "ASC"]]
            });
            res.json(teams);
        } catch (err) {
            console.error("Error fetching CFB teams:", err);
            res.status(500).json({ error: "Failed to fetch CFB teams" });
        }
    });

    // --------------------------------------------------------
    // POST /api/cfb_bowl_pickem/picks (Save batch confidence rankings)
    // --------------------------------------------------------
    app.post("/api/cfb_bowl_pickem/picks", requireAuth, async (req, res) => {
        const t = await db.sequelize.transaction();
        try {
            const { picks } = req.body;

            if (!Array.isArray(picks)) {
                await t.rollback();
                return res.status(400).json({ error: "Invalid picks payload." });
            }

            const allGames = await CfbBowlSeasonGames.findAll({
                transaction: t
            });
            const gameMap = {};
            allGames.forEach(g => { gameMap[g.id] = g; });

            const existingPicks = await CfbBowlPicks.findAll({
                where: { user_id: req.user.id },
                transaction: t
            });
            const existingPickMap = {};
            existingPicks.forEach(p => { existingPickMap[p.game_id] = p; });

            const totalGames = allGames.length;
            const pointsUsed = new Set();

            for (const p of picks) {
                const game = gameMap[p.game_id];
                const isLocked = game && game.game_date && new Date() >= new Date(game.game_date);

                if (!isLocked) {
                    const pts = Number(p.confidence_points);
                    if (pts < 1 || pts > totalGames) {
                        await t.rollback();
                        return res.status(400).json({ error: `Confidence points must be between 1 and ${totalGames}.` });
                    }
                    if (pointsUsed.has(pts)) {
                        await t.rollback();
                        return res.status(400).json({ error: `Duplicate confidence point value (${pts}) detected. Each rank must be unique.` });
                    }
                    pointsUsed.add(pts);
                }
            }

            for (const p of picks) {
                const game = gameMap[p.game_id];
                if (!game) continue;

                const isLocked = game.game_date && new Date() >= new Date(game.game_date);
                if (isLocked) continue;

                let existingPick = existingPickMap[p.game_id];
                if (existingPick) {
                    await existingPick.update({
                        picked_team: p.picked_team,
                        confidence_points: Number(p.confidence_points)
                    }, { transaction: t });
                } else {
                    await CfbBowlPicks.create({
                        user_id: req.user.id,
                        game_id: p.game_id,
                        picked_team: p.picked_team,
                        confidence_points: Number(p.confidence_points)
                    }, { transaction: t });
                }
            }

            await t.commit();
            res.json({ success: true, message: "Bowl confidence rankings saved successfully!" });
        } catch (err) {
            await t.rollback();
            console.error("CRITICAL Error saving bowl picks:", err);
            res.status(500).json({ error: err.message || "Failed to save bowl picks" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_bowl_pickem/matrix (Fetch group picks matrix)
    // --------------------------------------------------------
    app.get("/api/cfb_bowl_pickem/matrix", requireAuth, async (req, res) => {
        try {
            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name as user_name,
                    g.id as game_id,
                    g.bowl_game,
                    g.bowl_logo,
                    g.home_team,
                    g.home_color,
                    g.home_secondary_color,
                    g.home_team_nickname,
                    g.home_logo,
                    g.home_score,
                    g.away_team,
                    g.away_color,
                    g.away_secondary_color,
                    g.away_team_nickname,
                    g.away_logo,
                    g.away_score,
                    g.game_date,
                    g.status,
                    g.live_status,
                    p.picked_team,
                    p.confidence_points,
                    p.status as pick_status,
                    g.winner
                FROM cfb_bowl_season_games g
                LEFT JOIN cfb_bowl_entries e ON 1=1
                LEFT JOIN cfb_bowl_picks p ON e.user_id = p.user_id AND g.id = p.game_id
                ORDER BY e.entry_name ASC, g.game_date ASC;
            `;

            const [results] = await db.sequelize.query(query);

            const teamNames = new Set();
            results.forEach(row => {
                if (row.home_team) teamNames.add(row.home_team);
                if (row.away_team) teamNames.add(row.away_team);
            });

            const teamsData = await CfbTeams.findAll({
                where: { name: Array.from(teamNames) }
            });

            const teamColorMap = {};
            teamsData.forEach(t => {
                teamColorMap[t.name] = {
                    primaryColor: t.primary_color,
                    secondaryColor: t.secondary_color,
                    logo: t.logo
                };
            });

            const mappedResults = results.map(row => {
                let pickStatus = (row.pick_status || row.status || "").toLowerCase();
                const winner = row.winner;
                const pickedTeam = row.picked_team;

                if (!pickStatus || pickStatus === "" || pickStatus === "pending") {
                    if (winner && pickedTeam) {
                        if (winner === pickedTeam) {
                            pickStatus = "win";
                        } else {
                            pickStatus = "loss";
                        }
                    }
                }

                const homeTeamMeta = teamColorMap[row.home_team] || {};
                const awayTeamMeta = teamColorMap[row.away_team] || {};

                return {
                    ...row,
                    user_id: row.user_id || 0,
                    user_name: row.user_name || "Unassigned",
                    home_color: homeTeamMeta.primaryColor || row.home_color,
                    home_secondary_color: homeTeamMeta.secondaryColor || row.home_secondary_color,
                    home_logo: homeTeamMeta.logo || row.home_logo,
                    away_color: awayTeamMeta.primaryColor || row.away_color,
                    away_secondary_color: awayTeamMeta.secondaryColor || row.away_secondary_color,
                    away_logo: awayTeamMeta.logo || row.away_logo,
                    pick_status: pickStatus
                };
            });

            res.json(mappedResults);
        } catch (err) {
            console.error("Error fetching bowl matrix:", err);
            res.status(500).json({ error: "Failed to fetch group matrix" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_bowl_pickem/standings (Leaderboard based on confidence points)
    // --------------------------------------------------------
    app.get("/api/cfb_bowl_pickem/standings", requireAuth, async (req, res) => {
        try {
            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name,
                    SUM(CASE 
                        WHEN g.winner IS NOT NULL AND g.winner = p.picked_team 
                        THEN p.confidence_points 
                        ELSE 0 
                    END) as total_points,
                    SUM(CASE WHEN g.winner IS NOT NULL AND g.winner = p.picked_team THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN g.winner IS NOT NULL AND g.winner != p.picked_team THEN 1 ELSE 0 END) as losses
                FROM cfb_bowl_entries e
                LEFT JOIN cfb_bowl_picks p ON e.user_id = p.user_id
                LEFT JOIN cfb_bowl_season_games g ON p.game_id = g.id
                GROUP BY e.user_id, e.entry_name
                ORDER BY total_points DESC, wins DESC;
            `;

            const [results] = await db.sequelize.query(query);
            res.json(results);
        } catch (err) {
            console.error("Error fetching bowl standings:", err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

};