module.exports = function (sequelize, DataTypes) {
    const MlbPlayoffsSeries = sequelize.define("MlbPlayoffsSeries", {
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
        league: {
            type: DataTypes.STRING,   // "American" | "National" | "World Series"
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
        // ✨ New fields for active live game tracking
        live_summary: {
            type: DataTypes.STRING,   // e.g., "Top 4th", "Mid 7th", "Final"
            allowNull: true,
        },
        home_live_score: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        away_live_score: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: "mlb_playoffs_series",
        timestamps: true,
    });
    
    MlbPlayoffsSeries.associate = function (models) {
        MlbPlayoffsSeries.hasMany(models.MlbPlayoffsPicks, {
            foreignKey: "series_id"
        });
    };

    return MlbPlayoffsSeries;
};