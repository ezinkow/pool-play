const { Reminder, sequelize } = require("../models");
const requireAdmin = require("../middleware/requireAdmin");
const { sendEmail } = require("../utils/mailer");

module.exports = function (app) {
    // GET all reminders (Admin view)
    app.get("/api/admin/reminders", requireAdmin, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Access denied" });
            }
            const reminders = await Reminder.findAll({ order: [["send_at", "DESC"]] });
            res.json(reminders);
        } catch (err) {
            console.error("Failed to fetch reminders:", err);
            res.status(500).json({ error: "Failed to fetch reminders" });
        }
    });

    // POST create a new reminder manually
    app.post("/api/admin/reminders", requireAdmin, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Access denied" });
            }
            const { email, subject, message, send_at } = req.body;
            const reminder = await Reminder.create({
                user_id: req.user.id,
                email,
                subject,
                message,
                send_at: new Date(send_at),
                sent: false
            });
            res.json({ success: true, reminder });
        } catch (err) {
            console.error("Failed to create reminder:", err);
            res.status(500).json({ error: "Failed to create reminder" });
        }
    });

    app.post("/api/admin/reminders/broadcast", requireAdmin, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { pool_key, subject, message } = req.body;

            if (!pool_key || !subject || !message) {
                return res.status(400).json({ error: "pool_key, subject, and message are required" });
            }

            // Construct the dynamic table name safely (e.g., nba_survivor_entries)
            const tableName = `${pool_key}_entries`;

            // Execute raw query using your exact logic
            const [results] = await sequelize.query(`
                SELECT u.email, u.name 
                FROM users u 
                JOIN ${tableName} e ON e.user_id = u.id
            `);

            if (!results || results.length === 0) {
                return res.status(404).json({ error: `No participants found for pool: ${pool_key}` });
            }

            // Loop through each user and send/schedule the email
            let sentCount = 0;
            for (const row of results) {
                if (row.email) {
                    await sendEmail(row.email, subject, message);
                    sentCount++;
                }
            }

            res.json({
                success: true,
                message: `Successfully broadcasted reminder to ${sentCount} participants in ${pool_key}!`
            });

        } catch (err) {
            console.error("Failed to broadcast pool reminders:", err);
            res.status(500).json({ error: "Failed to broadcast reminders. Check if the table name is correct." });
        }
    });

    // POST schedule a broadcast reminder for an entire pool
    app.post("/api/admin/reminders/schedule-broadcast", requireAdmin, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Access denied" });
            }

            const { pool_key, subject, message, send_at } = req.body;

            if (!pool_key || !subject || !message || !send_at) {
                return res.status(400).json({ error: "pool_key, subject, message, and send_at are required" });
            }

            // Construct the dynamic table name safely (e.g., cfb_pickem_ats_entries)
            const tableName = `${pool_key}_entries`;

            // Execute raw query to fetch participants
            const [results] = await sequelize.query(`
                SELECT u.email, u.name, u.id as user_id 
                FROM users u 
                JOIN ${tableName} e ON e.user_id = u.id
            `);

            if (!results || results.length === 0) {
                return res.status(404).json({ error: `No participants found for pool: ${pool_key}` });
            }

            // Loop through each participant and queue up a scheduled reminder
            let scheduledCount = 0;
            for (const row of results) {
                if (row.email) {
                    await Reminder.create({
                        user_id: row.user_id,
                        email: row.email,
                        subject: subject,
                        message: message,
                        send_at: new Date(send_at),
                        sent: false
                    });
                    scheduledCount++;
                }
            }

            res.json({
                success: true,
                message: `Successfully scheduled reminder for ${scheduledCount} participants in ${pool_key}!`
            });

        } catch (err) {
            console.error("Failed to schedule pool broadcast reminders:", err);
            res.status(500).json({ error: "Failed to schedule broadcast reminders. Check if the table name is correct." });
        }
    });

    // DELETE a reminder
    app.delete("/api/admin/reminders/:id", requireAdmin, async (req, res) => {
        try {
            if (!req.user.is_admin) {
                return res.status(403).json({ error: "Access denied" });
            }
            await Reminder.destroy({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch (err) {
            console.error("Failed to delete reminder:", err);
            res.status(500).json({ error: "Failed to delete reminder" });
        }
    });
};