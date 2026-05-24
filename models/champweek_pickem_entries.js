module.exports = function (sequelize, DataTypes) {
    const ChampWeekPickemEntries = sequelize.define("ChampWeekPickemEntries", {
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
        tableName: "champweek_pickem_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    ChampWeekPickemEntries.associate = function (models) {
        // Lets you easily do ChampWeekPickemEntries.findAll({ include: [models.Users] }) later
        ChampWeekPickemEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return ChampWeekPickemEntries;
};