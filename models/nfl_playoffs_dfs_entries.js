module.exports = function (sequelize, DataTypes) {
    const NflPlayoffsDfsEntries = sequelize.define("NflPlayoffsDfsEntries", {
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
        tableName: "nfl_playoffs_dfs_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    NflPlayoffsDfsEntries.associate = function (models) {
        NflPlayoffsDfsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NflPlayoffsDfsEntries;
};