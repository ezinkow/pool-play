module.exports = function (sequelize, DataTypes) {
    const MlbPlayoffsEntries = sequelize.define("MlbPlayoffsEntries", {
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
        tableName: "mlb_playoffs_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    MlbPlayoffsEntries.associate = function (models) {
        MlbPlayoffsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return MlbPlayoffsEntries;
};