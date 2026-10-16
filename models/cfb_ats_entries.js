module.exports = function (sequelize, DataTypes) {
    const CfbPickemAtsEntries = sequelize.define("CfbPickemAtsEntries", {
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
        tableName: "cfb_pickem_ats_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    CfbPickemAtsEntries.associate = function (models) {
        CfbPickemAtsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return CfbPickemAtsEntries;
};