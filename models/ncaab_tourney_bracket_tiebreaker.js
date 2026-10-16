module.exports = function (sequelize, DataTypes) {
    const NcaabTourneyBracketTiebreaker = sequelize.define("NcaabTourneyBracketTiebreaker", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        win_score: { type: DataTypes.INTEGER, allowNull: true },
        loss_score: { type: DataTypes.INTEGER, allowNull: true },
    }, { tableName: "ncaab_tourney_bracket_tiebreaker", timestamps: false });
    return NcaabTourneyBracketTiebreaker;
};