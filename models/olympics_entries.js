module.exports = function (sequelize, DataTypes) {
    const OlympicsEntries = sequelize.define("OlympicsEntries", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: "users", key: "id" },
        },
        entry_name: {
            type: DataTypes.STRING(255), // 🧠 Explicit bounds added for clean unique indexing
            allowNull: false,
            unique: true,
        },
    }, {
        tableName: "olympics_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    OlympicsEntries.associate = function (models) {
        // Lets you easily do OlympicsEntries.findAll({ include: [models.Users] }) later
        OlympicsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return OlympicsEntries;
};