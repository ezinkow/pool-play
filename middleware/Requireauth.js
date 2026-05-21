const { Users, Tokens } = require("../models");

/**
 * requireAuth middleware
 *
 * Checks for a valid shared token. Accepts token via:
 *   - Authorization: Bearer <token>   (preferred)
 *   - req.body.token
 *   - req.query.token
 *
 * On success, attaches req.user = { id, name, real_name } and calls next().
 * On failure, returns 401.
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers["authorization"] || "";
        const token =
            (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null) ||
            req.body?.token ||
            req.query?.token;

        if (!token) return res.status(401).json({ error: "No token provided" });

        const record = await Tokens.findOne({ where: { token } });
        if (!record || new Date() > new Date(record.expires)) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        const user = await Users.findByPk(record.user_id, {
            attributes: ["id", "name", "real_name"],
        });
        if (!user) return res.status(401).json({ error: "User not found" });

        // Slide expiry window — keep active users logged in
        await record.update({
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        req.user = user.toJSON();
        next();
    } catch (err) {
        console.error("requireAuth error:", err);
        res.status(500).json({ error: "Auth check failed" });
    }
}

module.exports = requireAuth;