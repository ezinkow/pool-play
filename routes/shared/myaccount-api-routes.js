const db = require("../../models");

module.exports = function (app) {
    app.get("/api/users/my-pools", async (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: "Missing authentic user credential index." });
        }

        try {
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            const allGames = await SettingsModel.findAll();

            const activePoolsSummary = [];

            for (const game of allGames) {
                const gameKey = game.game_key;
                let entryRecord = null;

                try {
                    // Dynamically map camelCase model names from game_key (e.g., nfl_pickem_ats -> NflPickemAtsEntry or NflPickemAtsEntries)
                    const normalizedKey = gameKey
                        .split('_')
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join('');
                    
                    const possibleModelNames = [
                        `${normalizedKey}Entries`,
                        `${normalizedKey}Entry`,
                        `${gameKey}Entries`,
                        `${gameKey}Entry`
                    ];

                    let TargetModel = null;
                    for (const modelName of possibleModelNames) {
                        if (db[modelName]) {
                            TargetModel = db[modelName];
                            break;
                        }
                    }

                    if (TargetModel) {
                        entryRecord = await TargetModel.findOne({ where: { user_id: userId } });
                    }

                    if (entryRecord) {
                        activePoolsSummary.push({
                            key: gameKey,
                            label: game.game_label,
                            emoji: game.emoji || "🏆",
                            route: game.route || game.prefix || `/${gameKey}`,
                            accent: game.accent || "#13447a",
                            title: game.title || "",
                            is_active: game.is_active
                        });
                    }
                } catch (scanErr) {
                    console.error(`Failed scanning entries for ${gameKey}:`, scanErr);
                }
            }

            return res.json(activePoolsSummary);
        } catch (err) {
            console.error("❌ Comprehensive pool scanner error:", err);
            return res.status(500).json({ error: "Failed to gather operational pool profiles." });
        }
    });
};