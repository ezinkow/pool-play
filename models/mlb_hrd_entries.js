module.exports = function (sequelize, DataTypes) {
    const MlbHrdEntries = sequelize.define("MlbHrdEntries", {
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
        tableName: "mlb_hrd_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    MlbHrdEntries.associate = function (models) {
        MlbHrdEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return MlbHrdEntries;
};