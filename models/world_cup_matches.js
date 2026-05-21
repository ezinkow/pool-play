module.exports = function (sequelize, DataTypes) {
    const WorldCupMatches = sequelize.define("WorldCupMatches", {
        match_id: { type: DataTypes.STRING, primaryKey: true }, // Using ESPN's ID string
        home_team: { type: DataTypes.STRING, allowNull: true },
        away_team: { type: DataTypes.STRING, allowNull: true },
        home_logo: { type: DataTypes.STRING, allowNull: true },
        away_logo: { type: DataTypes.STRING, allowNull: true },
        // Use a default value to prevent "doesn't have a default value" errors
        stage: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "TBD"
        },
        match_date: { type: DataTypes.DATE, allowNull: false },
        round: { type: DataTypes.INTEGER, defaultValue: 0 },
        round_label: { type: DataTypes.STRING, allowNull: true },
        points_value: { type: DataTypes.INTEGER, defaultValue: 1 },
        draw_points_value: { type: DataTypes.INTEGER, defaultValue: 0 },
        status: { type: DataTypes.STRING, defaultValue: "STATUS_SCHEDULED" },
        locked: { type: DataTypes.BOOLEAN, defaultValue: false },
        home_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        away_score: { type: DataTypes.INTEGER, defaultValue: 0 },
        group: { type: DataTypes.STRING, allowNull: true },
        bracket_slot: { type: DataTypes.INTEGER, allowNull: true },
        result: {
            type: DataTypes.ENUM("Home", "Away", "Draw", "Pending"),
            defaultValue: "Pending"
        }
    }, { tableName: "world_cup_matches", timestamps: false });

    return WorldCupMatches;
};