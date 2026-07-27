module.exports = function (sequelize, DataTypes) {
    const NflBtsEntries = sequelize.define("NflBtsEntries", {
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
        tableName: "nfl_bts_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    // 🧠 Standard association mapping block
    NflBtsEntries.associate = function (models) {
        // Lets you easily do NflBtsEntries.findAll({ include: [models.Users] }) later
        NflBtsEntries.belongsTo(models.Users, { foreignKey: "user_id" });
    };

    return NflBtsEntries;
};