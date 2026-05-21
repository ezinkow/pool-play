const db = require("../../models");

module.exports = function (app) {
    app.get("/api/users/my-pools", async (req, res) => {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: "Missing authentic user credential index." });
        }

        try {
            // 1. Grab EVERY game settings row so we can look up cross-game profiles cleanly
            const SettingsModel = db.GameSettings || db.gameSettings || db.GameSetting || db.game_settings;
            const allGames = await SettingsModel.findAll();

            const activePoolsSummary = [];

            // 2. Loop and inspect entries across models
            for (const game of allGames) {
                let entryRecord = null;

                const gameKey = game.game_key;
                const lookupPrefix = game.prefix || game.route || "";

                try {
                    // Use plural model references and target the correct column (user_id: userId)
                    if ((gameKey === "world_cup" || lookupPrefix.includes("worldcup")) && (db.WorldCupEntries || db.WorldCupEntry)) {
                        const Model = db.WorldCupEntries || db.WorldCupEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if ((gameKey === "nba" || lookupPrefix.includes("nba")) && (db.NbaEntries || db.NbaEntry)) {
                        const Model = db.NbaEntries || db.NbaEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if ((gameKey === "champ_week" || lookupPrefix.includes("tourneypickem")) && (db.TourneyPickemEntries || db.TourneyPickemEntry)) {
                        const Model = db.TourneyPickemEntries || db.TourneyPickemEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if (gameKey === "bracket" && (db.BracketEntries || db.BracketEntry)) {
                        const Model = db.BracketEntries || db.BracketEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if (gameKey === "tourneysquares" && (db.TourneySquaresEntries || db.TourneySquaresEntry)) {
                        const Model = db.TourneySquaresEntries || db.TourneySquaresEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if (gameKey === "nfl" && (db.NflEntries || db.NflEntry)) {
                        const Model = db.NflEntries || db.NflEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });

                    } else if (gameKey === "olympics" && (db.OlympicsEntries || db.OlympicsEntry)) {
                        const Model = db.OlympicsEntries || db.OlympicsEntry;
                        entryRecord = await Model.findOne({ where: { user_id: userId } });
                    }

                    if (entryRecord) {
                        activePoolsSummary.push({
                            key: gameKey,
                            label: game.game_label,
                            emoji: game.emoji || "🏆",
                            route: game.route || game.prefix || `/${gameKey}`,
                            accent: game.accent || "#13447a",
                            title: game.title || ""
                        });
                    }
                } catch (scanErr) {
                    // Silently absorb individual missing/unmigrated table failures in production
                }
            }

            return res.json(activePoolsSummary);
        } catch (err) {
            console.error("❌ Comprehensive pool scanner error:", err);
            return res.status(500).json({ error: "Failed to gather operational pool profiles." });
        }
    });
};