module.exports = function (sequelize, DataTypes) {
    const WorldCupPicks = sequelize.define("WorldCupPicks", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            // 🧠 This references world_cup_entries primary auto-incrementing key 'id'
            references: { model: "world_cup_entries", key: "id" }
        },
        match_id: {
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: "world_cup_matches", key: "match_id" }
        },
        selection: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    }, { tableName: "world_cup_picks", timestamps: true });

    WorldCupPicks.associate = function (models) {
        // 🧠 FIXED: Points cleanly back to the unique entry row primary key ID
        WorldCupPicks.belongsTo(models.WorldCupEntries, {
            foreignKey: 'user_id',
            targetKey: 'user_id'
        });

        WorldCupPicks.belongsTo(models.WorldCupMatches, {
            as: "match",
            foreignKey: "match_id"
        });
    };

    return WorldCupPicks;
};