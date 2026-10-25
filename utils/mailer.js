const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async (to, subject, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: '"Pool Play" <no-reply@poolplay.com>',
            to,
            subject,
            html: htmlContent,
        });
        console.log("✅ Email sent successfully! Message ID:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Mailer error details:", error);
        return false;
    }
};

// 👈 Make sure this export line is present and matches the name!
module.exports = { sendEmail };