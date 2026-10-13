module.exports = function (sequelize, DataTypes) {
    const NcaaTourneySquaresEntries = sequelize.define("NcaaTourneySquaresEntries", {
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
        tableName: "ncaa_tourney_squares_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    NcaaTourneySquaresEntries.associate = function (models) {
        // Lets you easily do NcaaTourneySquaresEntries.findAll({ include: [models.Users] }) later
        NcaaTourneySquaresEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NcaaTourneySquaresEntries;
};