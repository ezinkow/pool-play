const db = require("../../models");
const { Op } = require("sequelize");

module.exports = function (app) {
    app.get("/api/pools/next-game", async (req, res) => {
        try {
            const { game_key } = req.query;
            const now = new Date();

            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            if (!SettingsModel) {
                return res.status(500).json({ error: "GameSettings model not found" });
            }

            // 1. Fetch settings for this pool
            const setting = await SettingsModel.findOne({ where: { game_key } });
            if (!setting || !setting.games_model_name) {
                return res.json(null);
            }

            // 2. Grab the model directly from the db registry using the stored string name!
            const Model = db[setting.games_model_name];
            if (!Model || typeof Model.findOne !== "function") {
                return res.status(400).json({ error: `Invalid model name: ${setting.games_model_name}` });
            }

            // 3. Query the next upcoming game universally
            const nextGame = await Model.findOne({
                where: { game_date: { [Op.gt]: now } },
                order: [["game_date", "ASC"]]
            });

            res.json(nextGame || null);
        } catch (err) {
            console.error("Error fetching next game:", err);
            res.status(500).json({ error: "Failed to fetch next game" });
        }
    });
};