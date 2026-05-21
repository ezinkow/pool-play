module.exports = function (sequelize, DataTypes) {
    const NbaSeries = sequelize.define("NbaSeries", {
        id: {
            // ESPN's stable series-level ID
            type: DataTypes.STRING(64),
            primaryKey: true,
            allowNull: false,
        },
        round: {
            type: DataTypes.INTEGER,  // 1-4
            allowNull: false,
        },
        round_label: {
            type: DataTypes.STRING,   // "First Round" etc.
            allowNull: false,
        },
        round_points_max: {
            type: DataTypes.INTEGER,  // 32 / 24 / 16 / 8
            allowNull: false,
        },
        conference: {
            type: DataTypes.STRING,   // "East" | "West" | "Finals"
            allowNull: true,
        },
        series_slot: {
            type: DataTypes.INTEGER,  // position within round (1-8 for R1)
            allowNull: true,
        },
        home_team: { type: DataTypes.STRING, allowNull: true },
        away_team: { type: DataTypes.STRING, allowNull: true },
        home_logo: { type: DataTypes.TEXT, allowNull: true },
        away_logo: { type: DataTypes.TEXT, allowNull: true },
        home_seed: { type: DataTypes.INTEGER, allowNull: true },
        away_seed: { type: DataTypes.INTEGER, allowNull: true },
        home_wins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        away_wins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        winner: {
            type: DataTypes.STRING,   // team name, set when STATUS_FINAL
            allowNull: true,
        },
        series_length: {
            type: DataTypes.INTEGER,  // 4-7, set when STATUS_FINAL
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,   // STATUS_SCHEDULED | STATUS_IN_PROGRESS | STATUS_FINAL
            allowNull: true,
        },
        game_date: {
            type: DataTypes.DATE,     // next scheduled game tip-off
            allowNull: true,
        },
        locked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    }, {
        tableName: "nba_series",
        timestamps: true,
    });
    
    NbaSeries.associate = function (models) {
        NbaSeries.hasMany(models.NbaPicks, {
            foreignKey: "series_id"
        });
    };

    return NbaSeries;
};