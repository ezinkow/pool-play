module.exports = function (sequelize, DataTypes) {
    const OlympicsCountries = sequelize.define("OlympicsCountries", {
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
        tableName: "olympics_countries",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    return OlympicsCountries;
};
