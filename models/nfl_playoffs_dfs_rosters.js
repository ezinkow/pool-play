module.exports = function (sequelize, DataTypes) {
    const NflPlayoffsDfsRosters = sequelize.define("NflPlayoffsDfsRosters", {
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
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
        tableName: "nfl_playoffs_dfs_rosters",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: true,
    });

    return NflPlayoffsDfsRosters;
};
