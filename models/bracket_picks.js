module.exports = (sequelize, DataTypes) => {
    const BracketPicks = sequelize.define('BracketPicks', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        game_id: { type: DataTypes.STRING(255), allowNull: false },
        pick: { type: DataTypes.STRING(255), allowNull: true },
    }, {
        tableName: "bracket_picks",
        timestamps: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }],
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [{ unique: true, fields: ['user_id', 'game_id'] }]
    });

    BracketPicks.associate = (models) => {
        BracketPicks.belongsTo(models.BracketEntries, { foreignKey: 'user_id' });
        BracketPicks.belongsTo(models.BracketGames, { foreignKey: 'game_id', targetKey: 'id' });
    };

    return BracketPicks;
};