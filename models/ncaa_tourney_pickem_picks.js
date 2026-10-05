module.exports = (sequelize, DataTypes) => {
    const NcaaTourneyPickemPicks = sequelize.define('NcaaTourneyPickemPicks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.STRING(255), allowNull: false },
        pick: { type: DataTypes.STRING(255), allowNull: true },
        game_date: { type: DataTypes.DATE, allowNull: true },
        missed_pick_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: "ncaa_tourney_pickem_picks",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }]
    });

    NcaaTourneyPickemPicks.associate = (models) => {
        NcaaTourneyPickemPicks.belongsTo(models.NcaaTourneyPickemEntries, { foreignKey: 'user_id' });
        NcaaTourneyPickemPicks.belongsTo(models.NcaaTourneyGames, { foreignKey: 'game_id', targetKey: 'id' });
    };

    return NcaaTourneyPickemPicks;
};