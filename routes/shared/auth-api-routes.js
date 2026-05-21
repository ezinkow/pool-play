const { Users, Tokens, NbaEntries } = require("../../models");
const crypto = require("crypto");

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

    // POST /api/auth/verify — login with username + password, returns token
    app.post("/api/auth/verify", async (req, res) => {
        try {
            const { name, password } = req.body;
            const user = await Users.findOne({ where: { name } });
            if (!user || user.password !== password) {
                return res.json({ success: false });
            }

            // --- NEW LOGIC START ---
            const entry = await NbaEntries.findOne({ where: { user_id: user.id } });
            // --- NEW LOGIC END ---

            const token = crypto.randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await Tokens.upsert({ token, user_id: user.id, expires });

            // Add hasNbaEntry to the response below
            res.json({
                success: true,
                token,
                id: user.id, // Good to include ID for frontend lookups
                name: user.name,
                real_name: user.real_name,
                hasNbaEntry: !!entry // true if they joined, false if not
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

            // --- NEW LOGIC START ---
            const entry = await NbaEntries.findOne({ where: { user_id: user.id } });
            // --- NEW LOGIC END ---

            await record.update({
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            // Add id and hasNbaEntry to the response below
            res.json({
                success: true,
                id: user.id,
                name: user.name,
                real_name: user.real_name,
                hasNbaEntry: !!entry
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

    // POST /api/auth/signup — create new shared user
    app.post("/api/auth/signup", async (req, res) => {
        try {
            const { real_name, name, password, email, phone } = req.body;
            if (!real_name || !name || !password) {
                return res.status(400).json({ error: "Name, username, and password are required" });
            }
            const existing = await Users.findOne({ where: { name } });
            if (existing) return res.status(400).json({ error: "Username taken" });
            await Users.create({ real_name, name, password, email, phone });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Signup failed" });
        }
    });

    // POST /api/auth/change-password — lookup by email, update password
    app.post("/api/auth/changepassword", async (req, res) => {
        try {
            const { email, newPassword } = req.body;
            if (!email || !newPassword) {
                return res.status(400).json({ error: "Email and new password required" });
            }
            const user = await Users.findOne({ where: { email } });
            if (!user) return res.status(404).json({ error: "No account found with that email" });
            await user.update({ password: newPassword });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Password change failed" });
        }
    });
};