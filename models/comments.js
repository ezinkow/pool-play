module.exports = function (sequelize, DataTypes) {
    const Comments = sequelize.define("Comments", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
        tableName: "comments",
        timestamps: true
    });

    Comments.associate = function (models) {
        Comments.belongsTo(models.Users || models.User || models.users, {
            foreignKey: "user_id",
            as: "author"
        });
    };

    return Comments;
};