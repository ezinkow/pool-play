module.exports = function (sequelize, DataTypes) {
    const NbaEntries = sequelize.define("NbaEntries", {
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
        tableName: "nba_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    NbaEntries.associate = function (models) {
        // Lets you easily do NbaEntries.findAll({ include: [models.Users] }) later
        NbaEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NbaEntries;
};