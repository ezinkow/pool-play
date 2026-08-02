module.exports = (sequelize, DataTypes) => {
    const NflSurvivorPicks = sequelize.define("NflSurvivorPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false },
        team_name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, defaultValue: "pending" }
    });

    NflSurvivorPicks.associate = (models) => {
        NflSurvivorPicks.belongsTo(models.NflSurvivorEntries, {
            foreignKey: "user_id",
            targetKey: "user_id"
        });
        NflSurvivorPicks.belongsTo(models.NflRegularSeasonGames, {
            foreignKey: "game_id"
        });
    };

    return NflSurvivorPicks;
};