module.exports = function (sequelize, DataTypes) {
    const OlympicsMedalTables = sequelize.define(
        "OlympicsMedalTables",
        {
            country_name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            gold: DataTypes.INTEGER,
            silver: DataTypes.INTEGER,
            bronze: DataTypes.INTEGER,
            score: DataTypes.INTEGER,
        }, {
        tableName: "olympics_medal_tables",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    }
    );

    return OlympicsMedalTables;
};
