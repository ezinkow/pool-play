module.exports = function (sequelize, DataTypes) {
    const SuperBowlSquaresGrid = sequelize.define("SuperBowlSquaresGrid", {
        square_id: { type: DataTypes.INTEGER, primaryKey: true },
        owner_name: { type: DataTypes.STRING, allowNull: true },
        rowNumber: { type: DataTypes.INTEGER, allowNull: true },
        colNumber: { type: DataTypes.INTEGER, allowNull: true },
        grid_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        createdAt: { type: DataTypes.DATE, allowNull: true },
    }, {
        tableName: "superbowl_squares_grid",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });
    return SuperBowlSquaresGrid;
};