module.exports = function (sequelize, DataTypes) {
    const MlbEntries = sequelize.define("MlbEntries", {
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
        tableName: "mlb_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    MlbEntries.associate = function (models) {
        MlbEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return MlbEntries;
};