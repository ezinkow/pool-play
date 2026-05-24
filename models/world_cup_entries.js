module.exports = function (sequelize, DataTypes) {
    const WorldCupEntries = sequelize.define("WorldCupEntries", {
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
        tableName: "world_cup_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    WorldCupEntries.associate = function (models) {
        // Lets you easily do WorldCupEntries.findAll({ include: [models.Users] }) later
        WorldCupEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return WorldCupEntries;
};