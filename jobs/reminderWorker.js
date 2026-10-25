const cron = require("node-cron");
const { Op } = require("sequelize");
const db = require("../models");
const { sendEmail } = require("../utils/mailer");

function startReminderCron() {
    // Runs every minute to check for due reminders
    cron.schedule("*/1 * * * *", async () => {
        try {
            const now = new Date();

            const pendingReminders = await db.Reminder.findAll({
                where: {
                    send_at: { [Op.lte]: now },
                    sent: false
                }
            });

            if (pendingReminders.length === 0) return;

            console.log(`[Reminder Worker] Found ${pendingReminders.length} pending reminders to send.`);

            for (const reminder of pendingReminders) {
                await sendEmail(reminder.email, reminder.subject, reminder.message);

                // Mark as sent so it never triggers a duplicate email
                reminder.sent = true;
                await reminder.save();
            }
        } catch (err) {
            console.error("[Reminder Worker Error]:", err);
        }
    });

    console.log("[Reminder Worker] Background cron initialized successfully.");
}

module.exports = startReminderCron;