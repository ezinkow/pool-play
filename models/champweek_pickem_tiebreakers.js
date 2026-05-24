module.exports = function (sequelize, DataTypes) {
    const ChampWeekPickemTiebreaker = sequelize.define("ChampWeekPickemTiebreaker", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        win_score: { type: DataTypes.INTEGER, allowNull: true },
        loss_score: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        tableName: "champweek_pickem_tiebreaker",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return ChampWeekPickemTiebreaker;
};