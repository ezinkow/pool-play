module.exports = (sequelize, DataTypes) => {
    const NcaabTourneyBracketPicks = sequelize.define('NcaabTourneyBracketPicks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.STRING(255), allowNull: false },
        pick: { type: DataTypes.STRING(255), allowNull: true },
    }, {
        tableName: "ncaab_tourney_bracket_picks",
        timestamps: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }],
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }]
    });

    NcaabTourneyBracketPicks.associate = (models) => {
        NcaabTourneyBracketPicks.belongsTo(models.NcaabTourneyBracketEntries, { foreignKey: 'user_id' });
        NcaabTourneyBracketPicks.belongsTo(models.NcaabTourneyGames, { foreignKey: 'game_id', targetKey: 'id' });
    };

    return NcaabTourneyBracketPicks;
};