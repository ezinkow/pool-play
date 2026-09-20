module.exports = function (sequelize, DataTypes) {
    const NbaTeams = sequelize.define("NbaTeams", {
        city: { type: DataTypes.STRING, allowNull: false, unique: false },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        division: { type: DataTypes.STRING, allowNull: false },
        abbreviation: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },
        primary_color: { type: DataTypes.STRING, allowNull: true },
        secondary_color: { type: DataTypes.STRING, allowNull: true },
        bg_color: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "nba_teams",
        timestamps: false
    });

    return NbaTeams;
};