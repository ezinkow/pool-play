module.exports = function (sequelize, DataTypes) {
    const MlbPicks = sequelize.define("MlbPicks", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
        },
        series_id: {
            type: DataTypes.STRING(64),
            allowNull: false,
            references: { model: "nba_series", key: "id" },
        },
        pick: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        confidence: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        series_length_guess: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: "mlb_picks",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["user_id", "series_id"],
            },
        ],
    });

    MlbPicks.associate = function (models) {
        MlbPicks.belongsTo(models.MlbSeries, {
            foreignKey: "series_id",
            as: "series"
        });
    };

    return MlbPicks;
};