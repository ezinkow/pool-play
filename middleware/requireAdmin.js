const { Users } = require("../models");
const requireAuth = require("./Requireauth");

const requireAdmin = async (req, res, next) => {
    // First run standard token authentication (provided by requireAuth pattern)
    requireAuth(req, res, async () => {
        try {
            const user = await Users.findByPk(req.user.id);
            if (!user || !user.is_admin) {
                return res.status(403).json({ error: "Access denied. Administrator privileges required." });
            }
            req.adminUser = user;
            next();
        } catch (err) {
            console.error("Admin authorization error:", err);
            res.status(500).json({ error: "Authorization failed" });
        }
    });
};

module.exports = requireAdmin;