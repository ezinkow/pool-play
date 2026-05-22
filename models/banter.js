module.exports = function (sequelize, DataTypes) {
    const Banter = sequelize.define("Banter", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        game_key: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "Scopes banter to specific pools like 'worldcup', 'nba', etc."
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" }
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: "pool_banter",
        timestamps: true
    });

    Banter.associate = function (models) {
        Banter.belongsTo(models.Users || models.User || models.users, {
            foreignKey: "user_id",
            as: "author"
        });
    };

    return Banter;
};