const db = require("../../models");
const Filter = require("bad-words"); // 🧠 NO curly braces for v3 compatibility!

module.exports = function (app) {
    // Initialize the library engine instance globally for this route file
    const filter = new Filter();

    // 1. GET ALL SMACK TALK FOR A SPECIFIC GAME POOL
    app.get("/api/banter/:gameKey", async (req, res) => {
        try {
            const BanterModel = db.Banter || db.banter || db.pool_banter;
            const UserModel = db.Users || db.User || db.users;

            const chatLog = await BanterModel.findAll({
                where: { game_key: req.params.gameKey },
                include: [{
                    model: UserModel,
                    as: "author",
                    attributes: ["id", "name"]
                }],
                order: [["createdAt", "ASC"]],
                limit: 100
            });

            return res.json(chatLog);
        } catch (err) {
            console.error("❌ Failed fetching pool banter:", err);
            return res.status(500).json({ error: "Failed to gather smack talk logs." });
        }
    });

    // 2. SUBMIT A NEW SMACK TALK MESSAGE LINE WITH EXTERNAL DICTIONARY GUARD
    app.post("/api/banter", async (req, res) => {
        const { user_id, game_key, message } = req.body;

        if (!user_id || !game_key || !message?.trim()) {
            return res.status(400).json({ error: "Missing required chat parameters." });
        }

        try {
            const BanterModel = db.Banter || db.banter || db.pool_banter;
            const UserModel = db.Users || db.User || db.users;

            let sanitizedMessage = message.trim();

            // 🧼 The Package Shield: Checks the string and swaps out any hidden matches
            if (filter.isProfane(sanitizedMessage)) {
                sanitizedMessage = filter.clean(sanitizedMessage);
            }

            const entry = await BanterModel.create({
                user_id,
                game_key,
                message: sanitizedMessage
            });

            const enriched = await BanterModel.findOne({
                where: { id: entry.id },
                include: [{ model: UserModel, as: "author", attributes: ["id", "name"] }]
            });

            return res.json(enriched);
        } catch (err) {
            console.error("❌ Failed logging banter text line:", err);
            return res.status(500).json({ error: "Failed sending message line." });
        }
    });
};