module.exports = function (sequelize, DataTypes) {
    const MlbHrdRosters = sequelize.define("MlbHrdRosters", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        player_id: {
            type: DataTypes.STRING, // 👈 Changed from INTEGER to STRING to match hrd_players.id
            allowNull: false
        }
    }, {
        tableName: "hrd_rosters",
        timestamps: true
    });

    MlbHrdRosters.associate = (models) => {
        MlbHrdRosters.belongsTo(models.Users, { foreignKey: "user_id" });
        MlbHrdRosters.belongsTo(models.MlbHrdPlayers, { foreignKey: "player_id" });
    };

    return MlbHrdRosters;
};