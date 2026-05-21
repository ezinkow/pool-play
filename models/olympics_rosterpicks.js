module.exports = function (sequelize, DataTypes) {
    const OlympicsRosterPicks = sequelize.define("OlympicsRosterPicks", {
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        country_name: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: true,
        }
    }, {
        tableName: "olympics_rosterpicks",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: true,
    });

    return OlympicsRosterPicks;
};
