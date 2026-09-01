module.exports = function (sequelize, DataTypes) {
    const CfbRegularSeasonGames = sequelize.define("CfbRegularSeasonGames", {
        id: { type: DataTypes.STRING, allowNull: false, primaryKey: true, autoIncrement: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        home_team: { type: DataTypes.STRING, allowNull: false },
        home_team_nickname: { type: DataTypes.STRING, allowNull: false },
        home_team_id: { type: DataTypes.INTEGER, allowNull: false },
        home_team_conference: { type: DataTypes.STRING, allowNull: false },
        home_team_rank: { type: DataTypes.INTEGER, allowNull: true },
        away_team: { type: DataTypes.STRING, allowNull: false },
        away_team_nickname: { type: DataTypes.STRING, allowNull: false },
        away_team_id: { type: DataTypes.INTEGER, allowNull: false },
        away_team_conference: { type: DataTypes.STRING, allowNull: false },
        away_team_rank: { type: DataTypes.INTEGER, allowNull: true },
        must_pick: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        home_logo: { type: DataTypes.STRING, allowNull: true },
        away_logo: { type: DataTypes.STRING, allowNull: true },
        home_color: { type: DataTypes.STRING, allowNull: true },
        home_secondary_color: { type: DataTypes.STRING, allowNull: true },
        away_color: { type: DataTypes.STRING, allowNull: true },
        away_secondary_color: { type: DataTypes.STRING, allowNull: true },
        spread: { type: DataTypes.FLOAT, allowNull: true },
        spread_odds: { type: DataTypes.INTEGER, allowNull: true },
        away_spread_odds: { type: DataTypes.INTEGER, allowNull: true },
        adjusted_spread: { type: DataTypes.FLOAT, allowNull: true },
        over_under: { type: DataTypes.FLOAT, allowNull: true },
        favorite: { type: DataTypes.STRING, allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        status: { type: DataTypes.STRING, allowNull: true },
        home_score: { type: DataTypes.INTEGER, allowNull: true },
        away_score: { type: DataTypes.INTEGER, allowNull: true },
        winner: { type: DataTypes.STRING, allowNull: true },
        ats_winner: { type: DataTypes.STRING, allowNull: true },
        ou_result: { type: DataTypes.STRING, allowNull: true },
    }, {
        tableName: "cfb_regular_season_games",
        timestamps: true
    });

    return CfbRegularSeasonGames;
};