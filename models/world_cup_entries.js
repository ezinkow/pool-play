module.exports = function (sequelize, DataTypes) {
    const WorldCupEntries = sequelize.define("WorldCupEntries", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: "users", key: "id" },
        },
        entry_name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    }, {
        tableName: "world_cup_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    WorldCupEntries.associate = function (models) {
        // Direct relationship: One entry has many match picks saved under their user_id
        WorldCupEntries.hasMany(models.WorldCupMatchPicks || models.world_cup_match_picks, {
            as: "matchPicks",
            foreignKey: "user_id",
            sourceKey: "user_id" // Maps picks via the underlying shared user identifier
        });
    };

    return WorldCupEntries;
};