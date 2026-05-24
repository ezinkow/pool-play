module.exports = function (sequelize, DataTypes) {
    const ChampWeekPickemGames = sequelize.define("ChampWeekPickemGames", {
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
            type: DataTypes.STRING(255), // Optimized from TEXT
            allowNull: true,
        },
        home_logo: {
            type: DataTypes.STRING(2048), // Optimized for URLs
            allowNull: true,
        },
        away_team: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        away_logo: {
            type: DataTypes.STRING(2048),
            allowNull: true,
        },
        favorite: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        fav_logo: {
            type: DataTypes.STRING(2048),
            allowNull: true
        },
        underdog: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        dog_logo: {
            type: DataTypes.STRING(2048),
            allowNull: true
        },
        line: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        locked_favorite: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        locked_underdog: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        locked_fav_logo: {
            type: DataTypes.STRING(2048),
            allowNull: true
        },
        locked_dog_logo: {
            type: DataTypes.STRING(2048),
            allowNull: true
        },
        line_locked_time: {
            type: DataTypes.DATE
        },
        winner: {
            type: DataTypes.STRING(255),
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
            type: DataTypes.STRING(50), // Standardized length for short conference codes
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING(50), // e.g., "SCHEDULED", "LIVE", "FINAL"
            allowNull: true,
        },
        game_clock: {
            type: DataTypes.STRING(50), // e.g., "14:22 - 2nd"
            allowNull: true,
        },
        selectable: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        }
    }, {
        tableName: "champweek_pickem_games",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    return ChampWeekPickemGames;
};