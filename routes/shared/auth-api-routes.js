const { Users, Tokens } = require("../../models");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const requireAuth = require("../../middleware/Requireauth");

module.exports = function (app) {

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
};