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
            type: DataTypes.STRING(255),
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
        // Links this pool entry to the user profile table (users.id)
        WorldCupEntries.belongsTo(models.Users, { foreignKey: "user_id" });

        // 🧠 FIXED: Standard primary key mapping. An entry's unique ID owns the picks.
        // We tell it to look for the "user_id" column inside your picks table as the target hook.
        WorldCupEntries.hasMany(models.WorldCupPicks, {
            foreignKey: "user_id"
        });
    };

    return WorldCupEntries;
};