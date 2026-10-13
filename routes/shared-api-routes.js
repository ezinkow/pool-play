const { Users, Tokens, SyncStatus, GameSettings, CfbRegularSeasonGames } = require("../models");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const requireAuth = require("../middleware/Requireauth");
const db = require("../models");
const Filter = require("bad-words");

module.exports = function (app) {

    ////////////////////////////
    ////////AUTH ROUTES/////////
    ////////////////////////////
    // GET /api/auth/users — public list (id + name only, for dropdowns)
    app.get("/api/auth/users", async (req, res) => {
        try {
            const users = await Users.findAll({
                attributes: ["id", "name", "real_name"],
                order: [["name", "ASC"]],
            });
            res.json(users);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to load users" });
        }
    });

    // POST /api/auth/verify — login with username OR email + password, returns token
    app.post("/api/auth/verify", async (req, res) => {
        try {
            const { name, password } = req.body; // 'name' payload field can carry either username or email
            if (!name || !password) {
                return res.json({ success: false });
            }

            const identifier = name.trim();
            const user = await Users.findOne({
                where: {
                    [Op.or]: [
                        { name: identifier },
                        { email: identifier }
                    ]
                }
            });

            if (!user || !(await user.validPassword(password))) {
                return res.json({ success: false });
            }

            const token = crypto.randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await Tokens.upsert({ token, user_id: user.id, expires });

            res.json({
                success: true,
                token,
                id: user.id,
                name: user.name,
                real_name: user.real_name,
                is_admin: !!user.is_admin
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Verify failed" });
        }
    });

    // POST /api/auth/verify-token — validate stored token on page load
    app.post("/api/auth/verify-token", async (req, res) => {
        try {
            const { name, token } = req.body;
            const user = await Users.findOne({ where: { name } });
            if (!user) return res.json({ success: false });

            const record = await Tokens.findOne({
                where: { token, user_id: user.id },
            });
            if (!record || new Date() > new Date(record.expires)) {
                return res.json({ success: false });
            }

            await record.update({
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            res.json({
                success: true,
                id: user.id,
                name: user.name,
                real_name: user.real_name,
                is_admin: !!user.is_admin
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Token verify failed" });
        }
    });

    // POST /api/auth/logout — destroy token
    app.post("/api/auth/logout", async (req, res) => {
        try {
            const { token } = req.body;
            await Tokens.destroy({ where: { token } });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Logout failed" });
        }
    });

    // POST /api/auth/signup — create new shared user with security question/answer
    app.post("/api/auth/signup", async (req, res) => {
        try {
            const { real_name, name, password, email, phone, securityQuestion, securityAnswer } = req.body;

            if (!real_name || !name || !password || !email || !email.trim() || !securityQuestion || !securityAnswer) {
                return res.status(400).json({ error: "All required fields including security question and answer must be provided." });
            }

            const existingUsername = await Users.findOne({ where: { name } });
            if (existingUsername) return res.status(400).json({ error: "Username taken" });

            const existingEmail = await Users.findOne({ where: { email: email.trim() } });
            if (existingEmail) {
                return res.status(400).json({ error: "An account already exists for this email address." });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);

            await Users.create({
                real_name: real_name.trim(),
                name: name.trim(),
                password,
                email: email.trim(),
                phone: phone ? phone.trim() : null,
                security_question: securityQuestion,
                security_answer: hashedAnswer
            });

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Signup failed" });
        }
    });

    // GET /api/auth/security-question — fetch current user's set security question
    app.get("/api/auth/security-question", requireAuth, async (req, res) => {
        try {
            const user = await Users.findByPk(req.user.id);
            if (!user) return res.status(404).json({ error: "User not found" });
            res.json({ security_question: user.security_question || "" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to fetch security question" });
        }
    });

    // POST /api/auth/update-security-question — update security question & answer
    app.post("/api/auth/update-security-question", requireAuth, async (req, res) => {
        try {
            const { securityQuestion, securityAnswer, currentPassword } = req.body;
            if (!securityQuestion || !securityAnswer || !currentPassword) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const user = await Users.findByPk(req.user.id);
            if (!user || !(await user.validPassword(currentPassword))) {
                return res.status(400).json({ error: "Incorrect current password" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);

            user.security_question = securityQuestion;
            user.security_answer = hashedAnswer;
            await user.save();

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to update security question" });
        }
    });

    // POST /api/auth/changepassword — reset password using email, question, and answer
    app.post("/api/auth/changepassword", async (req, res) => {
        try {
            const { email, securityQuestion, securityAnswer, newPassword } = req.body;

            if (!email || !securityAnswer || !newPassword) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const user = await Users.findOne({ where: { email: email.trim() } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (securityQuestion && user.security_question && user.security_question !== securityQuestion) {
                return res.status(400).json({ error: "Selected security question does not match our records" });
            }

            if (!user.security_answer) {
                return res.status(400).json({ error: "No security answer configured for this account. Please contact admin." });
            }

            const isMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.security_answer);
            if (!isMatch) {
                return res.status(400).json({ error: "Incorrect security answer" });
            }

            user.password = newPassword;
            await user.save();

            res.json({ success: true, message: "Password updated successfully" });
        } catch (err) {
            console.error("Password reset error:", err);
            res.status(500).json({ error: "Failed to update password" });
        }
    });

    // POST /api/auth/forgot-username
    app.post("/api/auth/forgot-username", async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ error: "Email address is required." });
            }

            const user = await Users.findOne({ where: { email: email.trim() } });

            if (!user) {
                return res.status(404).json({ error: "No account found with that email address." });
            }

            res.json({ success: true, username: user.name });
        } catch (err) {
            console.error("Error recovering username:", err);
            res.status(500).json({ error: "Failed to retrieve username." });
        }
    });

    ////////////////////////////
    /////Account Dashboard//////
    ////////////////////////////

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
                            route: game.prefix,
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

    /////////////////////////
    ///////Game Settings/////
    /////////////////////////
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


    ////////////////////////
    //Countdown Component///
    ////////////////////////
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

            if (!nextGame) {
                return res.json(null);
            }

            // Return game data combined with the games_model_name for series checks
            res.json({
                ...nextGame.toJSON(),
                games_model_name: setting.games_model_name
            });
        } catch (err) {
            console.error("Error fetching next game:", err);
            res.status(500).json({ error: "Failed to fetch next game" });
        }
    });

    /////////////////////
    ///////Banter////////
    /////////////////////

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

    ///////////////////
    /////Comments//////
    ///////////////////
    app.get("/api/comments", async (req, res) => {
        try {
            const CommentModel = db.Comments || db.comment || db.comments;
            const UserModel = db.Users || db.User || db.users;

            const logs = await CommentModel.findAll({
                where: {
                    is_private: false // 🚫 Blocks ALL private notes from rendering on the front-end stream
                },
                include: [{
                    model: UserModel,
                    as: "author",
                    attributes: ["id", "name"]
                }],
                order: [["createdAt", "DESC"]],
                limit: 150
            });

            return res.json(logs);
        } catch (err) {
            console.error("❌ Failed fetching comments:", err);
            return res.status(500).json({ error: "Failed to gather comments feed." });
        }
    });

    // 2. CREATE A NEW COMMENT WITH PRIVACY TOGGLE + PROFANITY GUARD
    app.post("/api/comments", async (req, res) => {
        let { user_id, message, is_private } = req.body; // 🧠 Switched const to let so we can clean the text string

        if (!user_id || !message?.trim()) {
            return res.status(400).json({ error: "Required parameters are missing." });
        }

        try {
            const CommentModel = db.Comments || db.comment || db.comments;
            const UserModel = db.Users || db.User || db.users;

            // ✨ THE PROFANITY SHIELD: Checks and censors bad words with **** before hitting the DB
            let sanitizedMessage = message.trim();
            if (filter.isProfane(sanitizedMessage)) {
                sanitizedMessage = filter.clean(sanitizedMessage);
            }

            const newComment = await CommentModel.create({
                user_id,
                message: sanitizedMessage,
                is_private: !!is_private // Ensure strict boolean casting
            });

            const enriched = await CommentModel.findOne({
                where: { id: newComment.id },
                include: [{ model: UserModel, as: "author", attributes: ["id", "name"] }]
            });

            return res.json(enriched);
        } catch (err) {
            console.error("❌ Failed saving comment:", err);
            return res.status(500).json({ error: "Failed submitting comment." });
        }
    });
};