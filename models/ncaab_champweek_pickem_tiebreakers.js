module.exports = function (sequelize, DataTypes) {
    const NcaabChampWeekPickemTiebreaker = sequelize.define("NcaabChampWeekPickemTiebreaker", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        win_score: { type: DataTypes.INTEGER, allowNull: true },
        loss_score: { type: DataTypes.INTEGER, allowNull: true },
    }, {
        tableName: "ncaab_champ_week_tiebreaker",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return NcaabChampWeekPickemTiebreaker;
};