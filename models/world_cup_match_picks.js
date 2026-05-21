module.exports = function (sequelize, DataTypes) {
    const WorldCupMatchPicks = sequelize.define("WorldCupMatchPicks", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            // Links to your entries system at the database foreign key level
            references: { model: "world_cup_entries", key: "user_id" }
        },
        match_id: {
            // Note: If your sync file uses ESPN string IDs (event.id), 
            // make sure this type matches the primary key type in WorldCupMatches (DataTypes.STRING)
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: "world_cup_matches", key: "match_id" }
        },
        selection: {
            type: DataTypes.STRING(100), // Ensure it is a string of sufficient capacity, NOT an ENUM
            allowNull: false
        }
    }, { tableName: "world_cup_match_picks", timestamps: true });

    // ADD THIS ASSOCIATE BLOCK RIGHT HERE:
    WorldCupMatchPicks.associate = function (models) {
        // 1. Links the pick back to the customized pool entry profile
        WorldCupMatchPicks.belongsTo(models.WorldCupEntries || models.world_cup_entries, {
            foreignKey: "user_id",
            targetKey: "user_id"
        });

        // 2. Links the pick to the actual team matchups, logos, and scores
        WorldCupMatchPicks.belongsTo(models.WorldCupMatches || models.world_cup_matches, {
            as: "match",
            foreignKey: "match_id"
        });
    };

    return WorldCupMatchPicks;
};