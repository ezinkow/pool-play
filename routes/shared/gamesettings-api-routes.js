const db = require("../../models");
const { Op } = require("sequelize");

module.exports = function (app) {

    app.get("/api/settings/active-states", async (req, res) => {
        try {
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;

            if (!SettingsModel) {
                console.error("❌ Available Models inside your Sequelize index instance:", Object.keys(db));
                return res.status(500).json({ error: "GameSettings model was not registered correctly by the database engine." });
            }

            const records = await SettingsModel.findAll({
                order: [['createdAt', 'ASC']]
            });

            return res.json(records);
        } catch (err) {
            console.error("❌ Error retrieving game dashboard data rows:", err);
            return res.status(500).json({ error: "Failed to resolve system activation properties." });
        }
    });

    // GET /api/settings/pool-started?game_key=...
    app.get("/api/settings/pool-started", async (req, res) => {
        try {
            const { game_key } = req.query;
            let started = false;
            const now = new Date();

            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            if (SettingsModel) {
                const setting = await SettingsModel.findOne({ where: { game_key } });
                
                // Dynamically check if a corresponding sequelize model exists for this game prefix/key
                const dynamicModelName = Object.keys(db).find(m => m.toLowerCase().includes(game_key.toLowerCase().replace(/_/g, '')));
                if (dynamicModelName && db[dynamicModelName] && typeof db[dynamicModelName].findOne === 'function') {
                    try {
                        const firstEntry = await db[dynamicModelName].findOne({
                            order: [["game_date", "ASC"]]
                        });
                        if (firstEntry && firstEntry.game_date) {
                            started = now >= new Date(firstEntry.game_date);
                        }
                    } catch (e) {
                        // Fallback if table schema lacks game_date
                    }
                }

                // Fallback check via global GameSettings lock_date if dynamic schedule lookup isn't matched
                if (!started && setting && setting.lock_date) {
                    let lockStr = setting.lock_date;
                    if (typeof lockStr === 'string' && !lockStr.endsWith('Z') && !lockStr.includes('+')) {
                        lockStr = lockStr.replace(' ', 'T') + 'Z';
                    }
                    started = now >= new Date(lockStr);
                }
            }

            res.json({ started });
        } catch (err) {
            console.error("Error checking if pool started:", err);
            res.json({ started: false });
        }
    });
};