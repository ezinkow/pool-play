module.exports = function (sequelize, DataTypes) {
    const NcaaTeams = sequelize.define("NcaaTeams", {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        abbreviation: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },
        primary_color: { type: DataTypes.STRING, allowNull: true },
        secondary_color: { type: DataTypes.STRING, allowNull: true },
        conference: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "ncaa_teams",
        timestamps: false
    });

    return NcaaTeams;
};