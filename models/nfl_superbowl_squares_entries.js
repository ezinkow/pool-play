module.exports = function (sequelize, DataTypes) {
    const NflSuperBowlSquaresEntries = sequelize.define("NflSuperBowlSquaresEntries", {
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
        tableName: "nfl_superbowl_squares_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    NflSuperBowlSquaresEntries.associate = function (models) {
        // Lets you easily do NflSuperBowlSquaresEntries.findAll({ include: [models.Users] }) later
        NflSuperBowlSquaresEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NflSuperBowlSquaresEntries;
};