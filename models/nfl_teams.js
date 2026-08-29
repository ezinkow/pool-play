module.exports = function (sequelize, DataTypes) {
    const NflTeams = sequelize.define("NflTeams", {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        abbreviation: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },
        primary_color: { type: DataTypes.STRING, allowNull: true },
        secondary_color: { type: DataTypes.STRING, allowNull: true },
        bg_color: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "nfl_teams",
        timestamps: false
    });

    return NflTeams;
};