const bcrypt = require("bcrypt");

module.exports = function (sequelize, DataTypes) {
    const Users = sequelize.define("Users", {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        real_name: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
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
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    // Instance method to securely compare passwords during login
    Users.prototype.validPassword = async function (passwordInput) {
        return await bcrypt.compare(passwordInput, this.password);
    };

    return Users;
};