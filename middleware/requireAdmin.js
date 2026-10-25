const requireAuth = require("./Requireauth");

const requireAdmin = async (req, res, next) => {
    // Run requireAuth first
    requireAuth(req, res, () => {
        try {
            // Check the is_admin flag directly from req.user
            const isAdmin = req.user?.is_admin === true || req.user?.is_admin === 1 || req.user?.is_admin === "true";
            
            if (!isAdmin) {
                return res.status(403).json({ error: "Access denied. Administrator privileges required." });
            }
            
            next();
        } catch (err) {
            console.error("Admin authorization error:", err);
            res.status(500).json({ error: "Authorization failed" });
        }
    });
};

module.exports = requireAdmin;