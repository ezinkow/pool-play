module.exports = function (sequelize, DataTypes) {
    const TourneySquaresEntries = sequelize.define("TourneySquaresEntries", {
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
        tableName: "tourney_squares_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    TourneySquaresEntries.associate = function (models) {
        // Lets you easily do TourneySquaresEntries.findAll({ include: [models.Users] }) later
        TourneySquaresEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return TourneySquaresEntries;
};