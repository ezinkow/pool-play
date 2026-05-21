module.exports = function (sequelize, DataTypes) {
    const TourneyPickemGames = sequelize.define("TourneyPickemGames", {
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
        home_seed: { type: DataTypes.INTEGER, allowNull: true },
        away_team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        away_logo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        away_seed: { type: DataTypes.INTEGER, allowNull: true },
        favorite: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        fav_logo: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        underdog: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        dog_logo: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        line: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        locked_favorite: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        locked_underdog: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        locked_fav_logo: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        locked_dog_logo: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        line_locked_time: {
            type: DataTypes.DATE
        },
        winner: {
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
        conference_id: {
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
        selectable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        round_points: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        tableName: "tourney_pickem_games",
        timestamps: false
    });

    return TourneyPickemGames;
};