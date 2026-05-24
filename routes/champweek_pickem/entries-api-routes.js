// Requiring our models
const { Users, Tokens } = require("../../models/");


module.exports = function (app) {

    // Get everything in Users table
    app.get("/api/champweek/users", function (req, res) {
        Users.findAll({})
            .then(function (dbusers) {
                res.json(dbusers)
            })
    });

    // Find users where id = __
    app.get('/api/champweek/users/:id', function (req, res) {
        Users.findAll({
            where: {
                name: req.params.name
            }
        })
            .then(function (dbusers) {
                res.json(dbusers)
            })
    });

    // Find users where name = __
    app.get('/api/champweek/users/:name', function (req, res) {
        Users.findAll({
            where: {
                name: req.params.name
            }
        })
            .then(function (dbusers) {
                res.json(dbusers)
            })
    });

    //Submit name
    app.post("/api/champweek/users", function (req, res) {
        Users.create({
            real_name: req.body.real_name,
            name: req.body.name,
            password: req.body.password,
            email_address: req.body.email_address,
            phone: req.body.phone
        })
            .then(function (dbusers) {
                res.json(dbusers)
            })
    });

    app.post("/api/champweek/users/change-password", async (req, res) => {
        try {
            const { email, newPassword } = req.body;
            if (!email || !newPassword) return res.status(400).json({ error: "Email and new password required" });

            const user = await Users.findOne({ where: { email_address: email } });
            if (!user) return res.status(404).json({ error: "No account found with that email" });

            await user.update({ password: newPassword });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to update password" });
        }
    });

    const crypto = require("crypto");

    // Verify with password — returns token on success
    app.post("/api/champweek/users/verify", async (req, res) => {
        const { name, password } = req.body;
        const user = await Users.findOne({ where: { name, password } });
        if (!user) return res.json({ success: false });

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await Tokens.upsert({ token, name, expires });

        res.json({ success: true, token });
    });

    // Verify with saved token
    app.post("/api/champweek/users/verify-token", async (req, res) => {
        try {
            const { name, token } = req.body;
            if (!name || !token) return res.json({ success: false });

            const entry = await Tokens.findOne({ where: { token, name } });
            if (!entry) return res.json({ success: false });

            if (new Date() > new Date(entry.expires)) {
                await entry.destroy();
                return res.json({ success: false });
            }

            // Refresh expiry on successful use
            await entry.update({ expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
            res.json({ success: true });
        } catch (err) {
            console.error("Token verify error:", err);
            res.json({ success: false });
        }
    });

    // Call this on logout if you add a logout button
    app.post("/api/champweek/users/logout", async (req, res) => {
        const { token } = req.body;
        if (token) await Tokens.destroy({ where: { token } });
        res.json({ success: true });
    });

}