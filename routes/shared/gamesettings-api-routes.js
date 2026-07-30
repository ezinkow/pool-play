const db = require("../../models");

module.exports = function (app) {

    app.get("/api/settings/active-states", async (req, res) => {
        try {
            // Robust Fallback Check: Resolves if your model exports as singular, camelCase, or plural variations
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;

            if (!SettingsModel) {
                console.error("❌ Available Models inside your Sequelize index instance:", Object.keys(db));
                return res.status(500).json({ error: "GameSettings model was not registered correctly by the database engine." });
            }

            // Pull every row and all metadata attributes straight out of database
            const records = await SettingsModel.findAll({
                order: [['createdAt', 'ASC']]
            });

            return res.json(records);
        } catch (err) {
            console.error("❌ Error retrieving game dashboard data rows:", err);
            return res.status(500).json({ error: "Failed to resolve system activation properties." });
        }
    });
};