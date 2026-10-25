module.exports = function (sequelize, DataTypes) {
    const NflPlayoffsPickThreeEntries = sequelize.define("NflPlayoffsPickThreeEntries", {
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
        tableName: "nfl_playoffs_pickthree_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    NflPlayoffsPickThreeEntries.associate = function (models) {
        NflPlayoffsPickThreeEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NflPlayoffsPickThreeEntries;
};