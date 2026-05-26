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
            unique: true,
            references: { model: "users", key: "id" },
        },
        entry_name: {
            type: DataTypes.STRING(255), // 🧠 Explicit bounds added for clean unique indexing
            allowNull: false,
            unique: true,
        },
    }, {
        tableName: "mlb_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    MlbEntries.associate = function (models) {
        // Lets you easily do MlbEntries.findAll({ include: [models.Users] }) later
        MlbEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return MlbEntries;
};