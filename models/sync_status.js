module.exports = function (sequelize, DataTypes) {
    const SyncStatus = sequelize.define("SyncStatus", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        sync_file_route: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        sync_enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        }
    }, {
        tableName: "sync_status",
        timestamps: true
    });

    return SyncStatus;
};