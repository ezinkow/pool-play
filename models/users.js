module.exports = function (sequelize, DataTypes) {
    const Users = sequelize.define("Users", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        real_name: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        email: {
            type: DataTypes.STRING,
            allowNull: false, // Enforces constraint documentation across team environments
            unique: true
        },
        phone: { type: DataTypes.STRING, allowNull: true },
        is_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        tableName: "users",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return Users;
};