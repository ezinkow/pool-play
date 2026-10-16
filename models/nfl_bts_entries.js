module.exports = function (sequelize, DataTypes) {
    const NflBtsEntries = sequelize.define("NflBtsEntries", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
        },
        entry_name: {
            type: DataTypes.STRING(255), // Explicit bounds for clean indexing
            allowNull: false,
        },
        room_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
    }, {
        tableName: "nfl_bts_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
        indexes: [
            // Ensure a user can only have one entry per room
            {
                unique: true,
                fields: ["user_id", "room_id"]
            },
            // Ensure display names are unique within the same room
            {
                unique: true,
                fields: ["entry_name", "room_id"]
            }
        ]
    });

    // Standard association mapping block
    NflBtsEntries.associate = function (models) {
        NflBtsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NflBtsEntries;
};