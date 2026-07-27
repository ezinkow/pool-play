module.exports = function (sequelize, DataTypes) {
    const WorldCupPicks = sequelize.define("WorldCupPicks", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "world_cup_entries",
                key: "user_id" // Change 'id' to 'user_id' here
            }
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
        WorldCupPicks.belongsTo(models.WorldCupEntries, {
            foreignKey: 'user_id',
            targetKey: 'user_id', // Must match the primary key column name in WorldCupEntries
            constraints: true   // Ensures database-level foreign key is generated correctly
        });

        WorldCupPicks.belongsTo(models.WorldCupMatches, {
            as: "match",
            foreignKey: "match_id"
        });
    };

    return WorldCupPicks;
};