const { SuperBowlSquaresGrid } = require("../../models");
const { SuperBowlGames } = require("../../models");
const { Op } = require("sequelize");

const LOCK_TIME = new Date("2026-03-19T11:10:00-05:00");
const ROUND_PAYOUTS = { 1: 12.5, 2: 25, 3: 50, 4: 100, 5: 200, 6: 500 };

module.exports = function (app) {

    // Get full grid — filter by grid_id
    app.get("/api/superbowlsquares/grid", async (req, res) => {
        try {
            const grid_id = parseInt(req.query.grid_id) || 1;
            const squares = await SuperBowlSquaresGrid.findAll({
                where: { grid_id },
                order: [["square_id", "ASC"]]
            });
            res.json(squares);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load grid" });
        }
    });

    // Claim a square
    app.post("/api/superbowlsquares/claim", async (req, res) => {
        try {
            if (new Date() >= LOCK_TIME) {
                return res.status(403).json({ error: "Squares are locked" });
            }
            const { square_id, owner_name } = req.body;
            if (!owner_name) return res.status(400).json({ error: "Name required" });

            const square = await SuperBowlSquaresGrid.findOne({ where: { square_id } });
            if (!square) return res.status(404).json({ error: "Square not found" });
            if (square.owner_name) return res.status(409).json({ error: "Square already claimed" });

            await square.update({ owner_name });
            res.json({ success: true, square_id, owner_name });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Claim failed" });
        }
    });

    // Unclaim a square
    app.post("/api/superbowlsquares/unclaim", async (req, res) => {
        try {
            if (new Date() >= LOCK_TIME) {
                return res.status(403).json({ error: "Squares are locked" });
            }
            const { square_id, owner_name } = req.body;
            const square = await SuperBowlSquaresGrid.findOne({ where: { square_id } });
            if (!square) return res.status(404).json({ error: "Square not found" });
            if (square.owner_name !== owner_name) {
                return res.status(403).json({ error: "You can only unclaim your own squares" });
            }
            await square.update({ owner_name: null });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Unclaim failed" });
        }
    });

    // Results — accepts grid_id param
    app.get("/api/superbowlsquares/results", async (req, res) => {
        try {
            const grid_id = parseInt(req.query.grid_id) || 1;
            const games = await SuperBowlGamesBracket.findAll({
                where: { status: "STATUS_FINAL" },
                order: [["round", "ASC"], ["bracket_slot", "ASC"]]
            });
            const squares = await SuperBowlSquaresGrid.findAll({ where: { grid_id } });
            const squareMap = {};
            for (const s of squares) {
                if (s.rowNumber !== null && s.colNumber !== null) {
                    squareMap[`${s.colNumber}-${s.rowNumber}`] = s;
                }
            }

            const results = games.map(game => {
                const winnerScore = game.winner === game.home_team ? game.home_score : game.away_score;
                const loserScore = game.winner === game.home_team ? game.away_score : game.home_score;
                const winDigit = winnerScore % 10;
                const loseDigit = loserScore % 10;
                const key = `${winDigit}-${loseDigit}`;
                const square = squareMap[key];
                const payout = ROUND_PAYOUTS[game.round] || 0;

                return {
                    game_id: game.id,
                    round: game.round,
                    round_label: game.round_label,
                    home_team: game.home_team,
                    away_team: game.away_team,
                    home_score: game.home_score,
                    away_score: game.away_score,
                    winner: game.winner,
                    win_digit: winDigit,
                    lose_digit: loseDigit,
                    square_id: square?.square_id ?? null,
                    owner_name: square?.owner_name ?? null,
                    payout,
                };
            });

            res.json(results);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load results" });
        }
    });

    // My numbers — filter by grid_id
    app.get("/api/superbowlsquares/my-numbers", async (req, res) => {
        try {
            const grid_id = parseInt(req.query.grid_id) || 1;
            const squares = await SuperBowlSquaresGrid.findAll({
                where: { owner_name: { [Op.not]: null }, grid_id },
                order: [["square_id", "ASC"]]
            });

            const grouped = {};
            for (const s of squares) {
                if (!grouped[s.owner_name]) grouped[s.owner_name] = [];
                if (s.rowNumber !== null && s.colNumber !== null) {
                    grouped[s.owner_name].push(`${s.colNumber}-${s.rowNumber}`);
                } else {
                    grouped[s.owner_name].push(`#${s.square_id}`);
                }
            }

            res.json(grouped);
        } catch (err) {
            res.status(500).json({ error: "Failed" });
        }
    });

    //admin
    app.post("/api/superbowlsquares/admin/assign-numbers", async (req, res) => {
        try {
            const { grid_id, col_numbers, row_numbers } = req.body;
            // col_numbers: array of 10 numbers in order [col0, col1, ... col9]
            // row_numbers: array of 10 numbers in order [row0, row1, ... row9]

            const squares = await SuperBowlSquaresGrid.findAll({
                where: { grid_id },
                order: [["square_id", "ASC"]]
            });

            for (const square of squares) {
                const offset = grid_id === 1 ? 0 : 100;
                const colIdx = (square.square_id - offset) % 10;
                const rowIdx = Math.floor((square.square_id - offset) / 10);
                await square.update({
                    colNumber: col_numbers[colIdx],
                    rowNumber: row_numbers[rowIdx],
                });
            }

            res.json({ success: true, grid_id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to assign numbers" });
        }
    });
};