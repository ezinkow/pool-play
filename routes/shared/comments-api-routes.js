// server/routes/shared/comments-api-routes.js
const db = require("../../models");
const { Op } = require("sequelize"); // Import Sequelize operators

module.exports = function (app) {

    // 1. FETCH FILTERED PUBLIC + OWN PRIVATE COMMENTS
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

    // 2. CREATE A NEW COMMENT WITH PRIVACY TOGGLE
    app.post("/api/comments", async (req, res) => {
        const { user_id, message, is_private } = req.body;

        if (!user_id || !message?.trim()) {
            return res.status(400).json({ error: "Required parameters are missing." });
        }

        try {
            const CommentModel = db.Comments || db.comment || db.comments;
            const UserModel = db.Users || db.User || db.users;

            const newComment = await CommentModel.create({
                user_id,
                message: message.trim(),
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