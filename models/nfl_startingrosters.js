module.exports = function (sequelize, DataTypes) {
    const NflStartingLineups = sequelize.define("NflStartingLineups", {
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        round: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        player_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        position: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        team: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        slot: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    }, {
        tableName: "nfl_starting_lineups",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: true,
    });

    return NflStartingLineups;
};
