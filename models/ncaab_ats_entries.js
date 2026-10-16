module.exports = function (sequelize, DataTypes) {
    const NcaabPickemAtsEntries = sequelize.define("NcaabPickemAtsEntries", {
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
        tableName: "ncaab_pickem_ats_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // Standard association mapping block
    NcaabPickemAtsEntries.associate = function (models) {
        NcaabPickemAtsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NcaabPickemAtsEntries;
};