module.exports = function (sequelize, DataTypes) {
    const BracketGames = sequelize.define("BracketGames", {
        id: {
            type: DataTypes.STRING(255),
            primaryKey: true,
            allowNull: false
        },
        game_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        region: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        round: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        round_label: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        round_points: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        bracket_slot: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        home_team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        home_seed: {
            type: DataTypes.INTEGER,
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
        away_seed: {
            type: DataTypes.INTEGER,
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
        tableName: "bracket_games",
        timestamps: false
    });
    return BracketGames;
};