module.exports = function (sequelize, DataTypes) {
    const NflEntries = sequelize.define("NflEntries", {
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
            // Display name shown in standings + group picks
            // Defaults to username but user can customise at sign-up
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    }, {
        tableName: "nfl_entries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return NflEntries;
};