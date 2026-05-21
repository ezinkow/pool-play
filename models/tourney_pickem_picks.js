module.exports = (sequelize, DataTypes) => {
    const TourneyPickemPicks = sequelize.define('TourneyPickemPicks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.STRING(255), allowNull: false },
        pick: { type: DataTypes.STRING(255), allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        missed_pick_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: "tourney_pickem_picks",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }]
    });

    TourneyPickemPicks.associate = (models) => {
        TourneyPickemPicks.belongsTo(models.TourneyPickemEntries, { foreignKey: 'user_id' });
        TourneyPickemPicks.belongsTo(models.TourneyPickemGames, { foreignKey: 'game_id', targetKey: 'id' });
    };

    return TourneyPickemPicks;
};