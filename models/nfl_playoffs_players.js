const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const NflPlayoffsPlayers = sequelize.define("NflPlayoffsPlayers", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        player_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        position: {
            type: DataTypes.STRING, // QB, RB, WR, TE
            allowNull: false
        },
        team: {
            type: DataTypes.STRING, // e.g., "KC", "SF"
            allowNull: true
        },
        opponent: {
            type: DataTypes.STRING, // Current round opponent (updated via sync)
            allowNull: true
        },
        is_eliminated: {
            type: DataTypes.BOOLEAN, // Automatically flags true when the player's NFL team is knocked out
            allowNull: false,
            defaultValue: false
        },
        points_round_1: {
            type: DataTypes.FLOAT, // Wild Card points
            allowNull: false,
            defaultValue: 0.0
        },
        points_round_2: {
            type: DataTypes.FLOAT, // Divisional points
            allowNull: false,
            defaultValue: 0.0
        },
        points_round_3: {
            type: DataTypes.FLOAT, // Conference Championship points
            allowNull: false,
            defaultValue: 0.0
        },
        points_round_4: {
            type: DataTypes.FLOAT, // Super Bowl points
            allowNull: false,
            defaultValue: 0.0
        },
        total_points: {
            type: DataTypes.FLOAT, // Cumulative postseason points across all rounds
            allowNull: false,
            defaultValue: 0.0
        }
    }, {
        tableName: "nfl_playoffs_players",
        timestamps: true
    });

    return NflPlayoffsPlayers;
};