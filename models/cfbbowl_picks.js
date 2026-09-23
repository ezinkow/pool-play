module.exports = function (sequelize, DataTypes) {
    const CfbBowlPicks = sequelize.define("CfbBowlPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false },
        picked_team: { type: DataTypes.STRING, allowNull: true },
        confidence_points: { type: DataTypes.STRING, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "cfb_bowl_picks",
        timestamps: true
    });

    return CfbBowlPicks;
};