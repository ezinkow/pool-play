module.exports = function (sequelize, DataTypes) {
    const NflBtsGames = sequelize.define("NflBtsGames", {
        week: { type: DataTypes.INTEGER, allowNull: false },
        home_team: { type: DataTypes.STRING, allowNull: false },
        away_team: { type: DataTypes.STRING, allowNull: false },
        home_logo: { type: DataTypes.STRING, allowNull: true },
        away_logo: { type: DataTypes.STRING, allowNull: true },
        home_color: { type: DataTypes.STRING, allowNull: true },
        away_color: { type: DataTypes.STRING, allowNull: true },
        spread: { type: DataTypes.FLOAT, allowNull: true },
        spread_odds: { type: DataTypes.INTEGER, allowNull: true },
        adjusted_spread: { type: DataTypes.FLOAT, allowNull: true },
        over_under: { type: DataTypes.FLOAT, allowNull: true },
        favorite: { type: DataTypes.STRING, allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "nfl_bts_games",
        timestamps: true
    });

    return NflBtsGames;
};