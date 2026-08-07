module.exports = function (sequelize, DataTypes) {
    const CfbTeams = sequelize.define("CfbTeams", {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        abbreviation: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },
        primary_color: { type: DataTypes.STRING, allowNull: true },
        secondary_color: { type: DataTypes.STRING, allowNull: true },
        conference: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "cfb_teams",
        timestamps: false
    });

    return CfbTeams;
};