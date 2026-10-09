module.exports = (sequelize, DataTypes) => {
    const NflSurvivorSecondChancePicks = sequelize.define("NflSurvivorSecondChancePicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.INTEGER, allowNull: false },
        team_name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, defaultValue: "pending" }
    }, {
        tableName: "nfl_survivor_secondchance_picks",
        timestamps: true
    });

    NflSurvivorSecondChancePicks.associate = (models) => {
        NflSurvivorSecondChancePicks.belongsTo(models.NflSurvivorSecondChanceEntries, {
            foreignKey: "user_id",
            targetKey: "user_id"
        });
        NflSurvivorSecondChancePicks.belongsTo(models.NflRegularSeasonGames, {
            foreignKey: "game_id",
            targetKey: "id"
        });
    };

    return NflSurvivorSecondChancePicks;
};
