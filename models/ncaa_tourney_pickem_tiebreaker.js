module.exports = function (sequelize, DataTypes) {
    const NcaaTourneyPickemTiebreaker = sequelize.define("NcaaTourneyPickemTiebreaker", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        win_score: { type: DataTypes.INTEGER, allowNull: true },
        loss_score: { type: DataTypes.INTEGER, allowNull: true },
    }, { tableName: "ncaa_tourney_pickem_tiebreaker", timestamps: false });
    return NcaaTourneyPickemTiebreaker;
};