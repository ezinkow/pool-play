module.exports = function (sequelize, DataTypes) {
    const MlbTeams = sequelize.define("MlbTeams", {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        league: { type: DataTypes.STRING, allowNull: false },
        abbreviation: { type: DataTypes.STRING, allowNull: true },
        logo: { type: DataTypes.STRING, allowNull: true },
        primary_color: { type: DataTypes.STRING, allowNull: true },
        secondary_color: { type: DataTypes.STRING, allowNull: true },
        bg_color: { type: DataTypes.STRING, allowNull: true }
    }, {
        tableName: "mlb_teams",
        timestamps: false
    });

    return MlbTeams;
};