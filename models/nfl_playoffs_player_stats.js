module.exports = function (sequelize, DataTypes) {
    const NflPlayoffsPlayerStats = sequelize.define("NflPlayoffsPlayerStats", {

        espn_id: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        team: DataTypes.STRING,
        position: DataTypes.STRING,
        fantasy_points: DataTypes.FLOAT,
        round: DataTypes.INTEGER,
    }, {
        tableName: "nfl_playoffs_player_stats",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    return NflPlayoffsPlayerStats;
};
