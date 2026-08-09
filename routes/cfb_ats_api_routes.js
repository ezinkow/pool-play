const { CfbRegularSeasonGames, CfbPickemAtsPicks, CfbPickemAtsEntries, CfbTeams, Users } = require("../models");
const requireAuth = require("../middleware/Requireauth");
const { Op } = require("sequelize");
const db = require("../models");

module.exports = function (app) {

    // --------------------------------------------------------
    // GET /api/cfb_pickem_ats/entries/me (Check user entry status)
    // --------------------------------------------------------
    app.get("/api/cfb_pickem_ats/entries/me", requireAuth, async (req, res) => {
        try {
            const entry = await CfbPickemAtsEntries.findOne({
                where: { user_id: req.user.id }
            });
            res.json({ entry: entry || null });
        } catch (err) {
            console.error("Error fetching pick'em entry:", err);
            res.status(500).json({ error: "Failed to fetch entry" });
        }
    });

    // --------------------------------------------------------
    // POST /api/cfb_pickem_ats/entries/create (Join pool)
    // --------------------------------------------------------
    app.post("/api/cfb_pickem_ats/entries/create", requireAuth, async (req, res) => {
        try {
            const { entry_name } = req.body;
            const finalName = entry_name?.trim() || req.user.name || "Player";

            let entry = await CfbPickemAtsEntries.findOne({
                where: { user_id: req.user.id }
            });

            if (entry) {
                await entry.update({ entry_name: finalName });
            } else {
                entry = await CfbPickemAtsEntries.create({
                    user_id: req.user.id,
                    entry_name: finalName
                });
            }

            res.json({ success: true, entry });
        } catch (err) {
            console.error("Error creating pick'em entry:", err);
            res.status(500).json({ error: "Failed to join pool" });
        }
    });

    // --------------------------------------------------------
    // POST /api/cfb_pickem_ats/entries/leave (Leave pool)
    // --------------------------------------------------------
    app.post("/api/cfb_pickem_ats/entries/leave", requireAuth, async (req, res) => {
        try {
            await CfbPickemAtsEntries.destroy({
                where: { user_id: req.user.id }
            });
            res.json({ success: true, message: "Successfully left pool." });
        } catch (err) {
            console.error("Error leaving pick'em pool:", err);
            res.status(500).json({ error: "Failed to leave pool" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_pickem_ats/games (Fetch schedule & user picks for a week)
    // --------------------------------------------------------
    app.get("/api/cfb_pickem_ats/games", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            // 1. Get all regular season games for the week
            const games = await CfbRegularSeasonGames.findAll({
                where: { week },
                order: [["game_date", "ASC"]]
            });

            // 2. Get user's current picks for this week
            const userPicks = await CfbPickemAtsPicks.findAll({
                where: { user_id: req.user.id, week }
            });

            const pickMap = {};
            userPicks.forEach(p => {
                pickMap[p.game_id] = {
                    picked_team: p.picked_team,
                    is_best_bet: p.is_best_bet
                };
            });

            res.json({ games, userPicks: pickMap });
        } catch (err) {
            console.error("Error fetching pick'em games:", err);
            res.status(500).json({ error: "Failed to load weekly schedule" });
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
    // POST /api/cfb_pickem_ats/picks (Save batch picks for the week)
    // --------------------------------------------------------
    app.post("/api/cfb_pickem_ats/picks", requireAuth, async (req, res) => {
        try {
            const { week, picks } = req.body; // picks is an array: [{ game_id, picked_team, is_best_bet }]
            const targetWeek = parseInt(week);

            if (!Array.isArray(picks)) {
                return res.status(400).json({ error: "Invalid picks payload." });
            }

            // 1. Count best bets and validate max 3
            const bestBetCount = picks.filter(p => p.is_best_bet === true).length;
            if (bestBetCount > 3) {
                return res.status(400).json({ error: "You can only select a maximum of 3 Best Bets per week." });
            }

            // 2. Process each pick with kickoff check
            for (const p of picks) {
                const game = await CfbRegularSeasonGames.findByPk(p.game_id);
                if (!game) continue;

                // Check if game has kicked off
                if (game.game_date && new Date() >= new Date(game.game_date)) {
                    return res.status(403).json({ error: `Game (${game.away_team} @ ${game.home_team}) has already kicked off. Picks are locked.` });
                }

                // Upsert pick
                let existingPick = await CfbPickemAtsPicks.findOne({
                    where: { user_id: req.user.id, week: targetWeek, game_id: p.game_id }
                });

                if (existingPick) {
                    await existingPick.update({
                        picked_team: p.picked_team,
                        is_best_bet: p.is_best_bet || false
                    });
                } else {
                    await CfbPickemAtsPicks.create({
                        user_id: req.user.id,
                        week: targetWeek,
                        game_id: p.game_id,
                        picked_team: p.picked_team,
                        is_best_bet: p.is_best_bet || false
                    });
                }
            }

            res.json({ success: true, message: "Weekly picks saved successfully!" });
        } catch (err) {
            console.error("Error saving pick'em picks:", err);
            res.status(500).json({ error: "Failed to save picks" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_pickem_ats/mypicks (Fetch user's picks and results for a week)
    // --------------------------------------------------------
    app.get("/api/cfb_pickem_ats/mypicks", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            // 1. Get games for the week
            const games = await CfbRegularSeasonGames.findAll({
                where: { week },
                order: [["game_date", "ASC"]]
            });

            // 2. Get user's picks for this week
            const userPicks = await CfbPickemAtsPicks.findAll({
                where: { user_id: req.user.id, week }
            });

            const pickMap = {};
            userPicks.forEach(p => {
                pickMap[p.game_id] = {
                    picked_team: p.picked_team,
                    is_best_bet: p.is_best_bet,
                    status: p.status // "win", "loss", "push", or null/pending
                };
            });

            res.json({ games, userPicks: pickMap });
        } catch (err) {
            console.error("Error fetching user pickem summary:", err);
            res.status(500).json({ error: "Failed to load pick summary" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_pickem_ats/matrix (Fetch group picks matrix for a week)
    // --------------------------------------------------------
    app.get("/api/cfb_pickem_ats/matrix", requireAuth, async (req, res) => {
        try {
            const week = parseInt(req.query.week) || 1;

            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name as user_name,
                    g.id as game_id,
                    g.week,
                    g.home_team,
                    g.home_color,
                    g.home_secondary_color,
                    g.home_team_nickname,
                    g.home_logo,
                    g.away_team,
                    g.away_color,
                    g.away_secondary_color,
                    g.away_team_nickname,
                    g.away_logo,
                    g.game_date,
                    g.adjusted_spread,
                    g.favorite,
                    p.picked_team as ats_pick,
                    p.is_best_bet,
                    p.status,
                    g.winner,
                    g.must_pick
                FROM cfb_pickem_ats_entries e
                CROSS JOIN cfb_regular_season_games g
                LEFT JOIN cfb_pickem_ats_picks p ON e.user_id = p.user_id AND g.id = p.game_id
                WHERE g.week = :week
                ORDER BY e.entry_name ASC, g.game_date ASC;
            `;

            const [results] = await db.sequelize.query(query, {
                replacements: { week }
            });

            res.json(results);
        } catch (err) {
            console.error("Error fetching pickem matrix:", err);
            res.status(500).json({ error: "Failed to fetch group matrix" });
        }
    });

    // --------------------------------------------------------
    // GET /api/cfb_pickem_ats/standings (Leaderboard, ATS & O/U records)
    // --------------------------------------------------------
    app.get("/api/cfb_pickem_ats/standings", requireAuth, async (req, res) => {
        try {
            const query = `
                SELECT 
                    e.user_id,
                    e.entry_name,
                    SUM(CASE 
                        WHEN g.ats_winner IS NOT NULL AND g.ats_winner = p.picked_team 
                        THEN (CASE WHEN p.is_best_bet = 1 THEN 2 ELSE 1 END) 
                        ELSE 0 
                    END) as total_points,
                    SUM(CASE WHEN g.ats_winner IS NOT NULL AND g.ats_winner = p.picked_team THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN g.ats_winner IS NOT NULL AND g.ats_winner != 'PUSH' AND g.ats_winner != p.picked_team THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN g.ats_winner IS NOT NULL AND g.ats_winner = 'PUSH' THEN 1 ELSE 0 END) as pushes,
                    SUM(CASE WHEN p.is_best_bet = 1 AND g.ats_winner = p.picked_team THEN 1 ELSE 0 END) as best_bet_wins,
                    SUM(CASE WHEN p.is_best_bet = 1 AND g.ats_winner IS NOT NULL AND g.ats_winner != 'PUSH' AND g.ats_winner != p.picked_team THEN 1 ELSE 0 END) as best_bet_losses,
                    SUM(CASE WHEN g.ou_result IS NOT NULL AND g.ou_result = p.ou_pick THEN 1 ELSE 0 END) as ou_wins,
                    SUM(CASE WHEN g.ou_result IS NOT NULL AND g.ou_result != 'PUSH' AND g.ou_result != p.ou_pick THEN 1 ELSE 0 END) as ou_losses,
                    SUM(CASE WHEN g.ou_result IS NOT NULL AND g.ou_result = 'PUSH' THEN 1 ELSE 0 END) as ou_pushes
                FROM cfb_pickem_ats_entries e
                LEFT JOIN cfb_pickem_ats_picks p ON e.user_id = p.user_id
                LEFT JOIN cfb_regular_season_games g ON p.game_id = g.id
                GROUP BY e.user_id, e.entry_name
                ORDER BY total_points DESC, wins DESC;
            `;

            const [results] = await db.sequelize.query(query);
            res.json(results);
        } catch (err) {
            console.error("Error fetching pickem standings:", err);
            res.status(500).json({ error: "Failed to fetch standings" });
        }
    });

};