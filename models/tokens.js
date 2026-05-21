module.exports = function (sequelize, DataTypes) {
    const Tokens = sequelize.define("Tokens", {
        token:   { type: DataTypes.STRING(64), primaryKey: true },
        user_id: { type: DataTypes.INTEGER,    allowNull: false },
        expires: { type: DataTypes.DATE,       allowNull: false },
    }, {
        tableName: "tokens",
        timestamps: false,
    });
    return Tokens;
};