module.exports = function (sequelize, DataTypes) {
    const HrdRosters = sequelize.define("HrdRosters", {
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

    HrdRosters.associate = (models) => {
        HrdRosters.belongsTo(models.Users, { foreignKey: "user_id" });
        HrdRosters.belongsTo(models.HrdPlayers, { foreignKey: "player_id" });
    };

    return HrdRosters;
};