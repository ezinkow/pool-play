module.exports = (sequelize, DataTypes) => {
    const NcaabTourneyPickemPicks = sequelize.define('NcaabTourneyPickemPicks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.STRING(255), allowNull: false },
        pick: { type: DataTypes.STRING(255), allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        missed_pick_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: "ncaab_tourney_pickem_picks",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }]
    });

    NcaabTourneyPickemPicks.associate = (models) => {
        NcaabTourneyPickemPicks.belongsTo(models.NcaabTourneyPickemEntries, { foreignKey: 'user_id' });
        NcaabTourneyPickemPicks.belongsTo(models.NcaabTourneyGames, { foreignKey: 'game_id', targetKey: 'id' });
    };

    return NcaabTourneyPickemPicks;
};