module.exports = function (sequelize, DataTypes) {
    const NbaTiebreaker = sequelize.define("NbaTiebreaker", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,   // one tiebreaker per user
            references: { model: "users", key: "id" },
        },
        win_score: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        loss_score: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
    }, {
        tableName: "nba_tiebreaker",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return NbaTiebreaker;
};