const bcrypt = require("bcrypt");
const db = require("./models"); // Adjust path to your models folder if necessary

async function migratePasswords() {
    try {
        await db.sequelize.authenticate();
        console.log("Database connected for password migration...");

        // Fetch all users
        const users = await db.Users.findAll();
        console.log(`Found ${users.length} users to check.`);

        for (const user of users) {
            // Check if the password is already hashed (bcrypt hashes start with $2b$ or $2a$)
            if (user.password && !user.password.startsWith("$2b$") && !user.password.startsWith("$2a$")) {
                console.log(`Hashing plain-text password for user: ${user.name}`);

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);

                // Update directly using update with individualHooks: false 
                // (or just set and save so it doesn't get double-hashed)
                user.password = hashedPassword;
                await user.save({ hooks: false }); // Bypass model hooks to avoid double-hashing
            } else {
                console.log(`Password for user ${user.name} is already hashed. Skipping.`);
            }
        }

        console.log("Password migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migratePasswords();