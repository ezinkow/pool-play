module.exports = function (sequelize, DataTypes) {
  const WorldCupCountryInfo = sequelize.define(
    "WorldCupCountryInfo",
    {
      id: {
       type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      flag_url: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "flag_url", // Maps to the 'flag' column in your DDL
      },
      group_name: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "group_name", // Maps to the 'group_name' column in your DDL
      },
    },
    {
      tableName: "world_cup_country_info",
      timestamps: false, // Matches your DDL (no createdAt/updatedAt)
    }
  );

  return WorldCupCountryInfo;
};