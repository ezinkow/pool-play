module.exports = (sequelize, DataTypes) => {
    const NbaSurvivorPicks = sequelize.define("NbaSurvivorPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false }, // 👈 Must match NbaRegularSeasonGames id (INTEGER)
        team_name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, defaultValue: "pending" }
    }, {
        tableName: "nba_survivor_picks",
        timestamps: true
    });

    NbaSurvivorPicks.associate = (models) => {
        NbaSurvivorPicks.belongsTo(models.NbaSurvivorEntries, {
            foreignKey: "user_id",
            targetKey: "user_id"
        });
        NbaSurvivorPicks.belongsTo(models.NbaRegularSeasonGames, {
            foreignKey: "game_id",
            targetKey: "id"
        });
    };

    return NbaSurvivorPicks;
};