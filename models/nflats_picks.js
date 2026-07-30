module.exports = function (sequelize, DataTypes) {
    const NflPickemAtsPicks = sequelize.define("NflPickemAtsPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false },
        picked_team: { type: DataTypes.STRING, allowNull: true },
        ou_pick: { type: DataTypes.STRING, allowNull: true }, 
        is_best_bet: { type: DataTypes.BOOLEAN, defaultValue: false }, 
        status: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "nfl_pickem_ats_picks",
        timestamps: true
    });

    return NflPickemAtsPicks;
};