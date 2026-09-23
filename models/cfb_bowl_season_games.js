module.exports = function (sequelize, DataTypes) {
    const CfbBowlSeasonGames = sequelize.define("CfbBowlSeasonGames", {
        id: { type: DataTypes.STRING, allowNull: true, primaryKey: true, autoIncrement: false },
        bowl_game: { type: DataTypes.STRING, allowNull: true },
        bowl_logo: { type: DataTypes.STRING, allowNull: true },
        home_team: { type: DataTypes.STRING, allowNull: true },
        home_team_nickname: { type: DataTypes.STRING, allowNull: true },
        home_team_id: { type: DataTypes.INTEGER, allowNull: true },
        home_team_conference: { type: DataTypes.STRING, allowNull: true },
        home_team_rank: { type: DataTypes.INTEGER, allowNull: true },
        away_team: { type: DataTypes.STRING, allowNull: true },
        away_team_nickname: { type: DataTypes.STRING, allowNull: true },
        away_team_id: { type: DataTypes.INTEGER, allowNull: true },
        away_team_conference: { type: DataTypes.STRING, allowNull: true },
        away_team_rank: { type: DataTypes.INTEGER, allowNull: true },
        home_logo: { type: DataTypes.STRING, allowNull: true },
        away_logo: { type: DataTypes.STRING, allowNull: true },
        home_color: { type: DataTypes.STRING, allowNull: true },
        home_secondary_color: { type: DataTypes.STRING, allowNull: true },
        away_color: { type: DataTypes.STRING, allowNull: true },
        away_secondary_color: { type: DataTypes.STRING, allowNull: true },
        spread: { type: DataTypes.FLOAT, allowNull: true },
        spread_odds: { type: DataTypes.INTEGER, allowNull: true },
        over_under: { type: DataTypes.FLOAT, allowNull: true },
        favorite: { type: DataTypes.STRING, allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: true },
        live_status: { type: DataTypes.STRING, allowNull: true },
        home_score: { type: DataTypes.INTEGER, allowNull: true },
        away_score: { type: DataTypes.INTEGER, allowNull: true },
        winner: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "cfb_bowl_season_games",
        timestamps: true
    });

    return CfbBowlSeasonGames;
};