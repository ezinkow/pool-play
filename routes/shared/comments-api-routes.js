const db = require("../../models");

module.exports = function (app) {
    // 1. FETCH ALL GLOBAL COMMENTS
    app.get("/api/comments", async (req, res) => {
        try {
            const CommentModel = db.Comments || db.Comment || db.comments;
            const UserModel = db.Users || db.User || db.users;

            const comments = await CommentModel.findAll({
                include: [{
                    model: UserModel,
                    as: "author",
                    attributes: ["id", "name"]
                }],
                order: [["createdAt", "DESC"]], // Newest suggestions at the top
                limit: 150
            });

            return res.json(comments);
        } catch (err) {
            console.error("❌ Failed fetching global comment feeds:", err);
            return res.status(500).json({ error: "Failed to gather operational feedback log." });
        }
    });

    // 2. SUBMIT A GLOBAL NOTE / COMMENT
    app.post("/api/comments", async (req, res) => {
        const { user_id, message } = req.body;

        if (!user_id || !message?.trim()) {
            return res.status(400).json({ error: "Required feedback text parameters are missing." });
        }

        try {
            const CommentModel = db.Comments || db.Comment || db.comments;
            
            const newComment = await CommentModel.create({
                user_id,
                message: message.trim()
            });

            const UserModel = db.Users || db.User || db.users;
            const enrichedComment = await CommentModel.findOne({
                where: { id: newComment.id },
                include: [{ model: UserModel, as: "author", attributes: ["id", "name"] }]
            });

            return res.json(enrichedComment);
        } catch (err) {
            console.error("❌ Failed logging global comment node:", err);
            return res.status(500).json({ error: "Failed submitting message entry." });
        }
    });
};