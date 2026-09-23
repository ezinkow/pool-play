module.exports = function (sequelize, DataTypes) {
    const CfbBowlEntries = sequelize.define("CfbBowlEntries", {
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
    }, {
        tableName: "cfb_bowl_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    CfbBowlEntries.associate = function (models) {
        CfbBowlEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return CfbBowlEntries;
};