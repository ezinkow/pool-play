module.exports = function (sequelize, DataTypes) {
    const HrdPlayers = sequelize.define("HrdPlayers", {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        short_name: { type: DataTypes.STRING },
        team: { type: DataTypes.STRING },
        headshot: { type: DataTypes.STRING },
        position: { type: DataTypes.STRING },
        salary: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // 2025 HRs
        hr_2025: { type: DataTypes.INTEGER, defaultValue: 0 },
        at_bats_2025: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_2026: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // Season total

        // Monthly breakdown columns for 2026
        hr_april: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_may: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_june: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_july: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_august: { type: DataTypes.INTEGER, defaultValue: 0 },
        hr_september: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, {
        tableName: "hrd_players",
        timestamps: true
    });

    return HrdPlayers;
};