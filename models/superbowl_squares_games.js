module.exports = function (sequelize, DataTypes) {
    const SuperBowlGames = sequelize.define("SuperBowlGames", {
        id: {
            type: DataTypes.STRING(255),
            primaryKey: true,
            allowNull: false
        },
        game_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        home_team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        home_logo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        away_team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        away_logo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        home_score: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        away_score: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        winner: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        game_clock: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        locked: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        }
    }, {
        tableName: "superbowl_games",
        timestamps: false
    });
    return SuperBowlGames;
};