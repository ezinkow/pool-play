module.exports = function (sequelize, DataTypes) {
    const CfbBowlConfidenceEntries = sequelize.define("CfbBowlConfidenceEntries", {
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
        tableName: "cfb_bowl_pickem_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    CfbBowlConfidenceEntries.associate = function (models) {
        CfbBowlConfidenceEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return CfbBowlConfidenceEntries;
};