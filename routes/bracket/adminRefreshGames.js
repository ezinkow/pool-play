const syncBracket = require("../../syncs/ncaab_bracket/sync.js");

module.exports = function (app) {
    app.post("/api/ncaab_bracket/admin/refresh-games", async (req, res) => {
        try {
            await syncBracket();
            res.json({ message: "Bracket sync complete" });
        } catch (err) {
            console.error("Bracket refresh failed", err);
            res.status(500).json({ error: "Refresh failed" });
        }
    });
};