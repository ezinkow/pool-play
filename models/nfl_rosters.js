module.exports = function (sequelize, DataTypes) {
    const NflRosters = sequelize.define("NflRosters", {
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        player_name: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        position: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        tier: {
            type: DataTypes.TEXT,
            allowNull: true,
        }
    }, {
        tableName: "nfl_rosters",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: true,
    });

    return NflRosters;
};
