module.exports = function (sequelize, DataTypes) {
    const NcaabTourneyPickemTiebreaker = sequelize.define("NcaabTourneyPickemTiebreaker", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        win_score: { type: DataTypes.INTEGER, allowNull: true },
        loss_score: { type: DataTypes.INTEGER, allowNull: true },
    }, { tableName: "ncaab_tourney_pickem_tiebreaker", timestamps: false });
    return NcaabTourneyPickemTiebreaker;
};