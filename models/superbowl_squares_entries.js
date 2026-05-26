module.exports = function (sequelize, DataTypes) {
    const SuperBowlSquaresEntries = sequelize.define("SuperBowlSquaresEntries", {
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
        tableName: "superbowl_squares_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    SuperBowlSquaresEntries.associate = function (models) {
        // Lets you easily do SuperBowlSquaresEntries.findAll({ include: [models.Users] }) later
        SuperBowlSquaresEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return SuperBowlSquaresEntries;
};