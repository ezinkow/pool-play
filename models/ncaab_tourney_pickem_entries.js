module.exports = function (sequelize, DataTypes) {
    const NcaabTourneyPickemEntries = sequelize.define("NcaabTourneyPickemEntries", {
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
        tableName: "ncaab_tourney_pickem_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    NcaabTourneyPickemEntries.associate = function (models) {
        // Lets you easily do NcaabTourneyPickemEntries.findAll({ include: [models.Users] }) later
        NcaabTourneyPickemEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NcaabTourneyPickemEntries;
};