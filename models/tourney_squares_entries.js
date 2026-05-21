module.exports = function (sequelize, DataTypes) {
    const TourneySquaresEntries = sequelize.define("TourneySquaresEntries", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        email: { type: DataTypes.STRING, allowNull: true },
        password: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        paid: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: "tourney_squares_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return TourneySquaresEntries;
};