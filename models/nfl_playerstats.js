module.exports = function (sequelize, DataTypes) {
    const NflPlayerStats = sequelize.define("NflPlayerStats", {

        espn_id: { type: DataTypes.STRING, allowNull: false, unique: true },
        name: { type: DataTypes.STRING, allowNull: false },
        team: DataTypes.STRING,
        position: DataTypes.STRING,
        fantasy_points: DataTypes.FLOAT,
        round: DataTypes.INTEGER,
    }, {
        tableName: "nfl_player_stats",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    return NflPlayerStats;
};
