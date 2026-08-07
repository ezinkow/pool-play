module.exports = function (sequelize, DataTypes) {
    const CfbPickemAtsPicks = sequelize.define("CfbPickemAtsPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false },
        picked_team: { type: DataTypes.STRING, allowNull: true },
        ou_pick: { type: DataTypes.STRING, allowNull: true }, 
        is_best_bet: { type: DataTypes.BOOLEAN, defaultValue: false }, 
        status: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "cfb_pickem_ats_picks",
        timestamps: true
    });

    return CfbPickemAtsPicks;
};