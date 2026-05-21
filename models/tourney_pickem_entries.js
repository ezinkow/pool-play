module.exports = function (sequelize, DataTypes) {
    const TourneyPickemEntries = sequelize.define("TourneyPickemEntries", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        real_name: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true },
        paid: { type: DataTypes.STRING, allowNull: true },
    }, {
        tableName: "tourney_pickem_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return TourneyPickemEntries;
};