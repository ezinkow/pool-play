module.exports = (sequelize, DataTypes) => {
  const NflSurvivorEntries = sequelize.define("NflSurvivorEntries", {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    entry_name: { type: DataTypes.STRING, allowNull: false },
    is_eliminated: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminated_week: { type: DataTypes.INTEGER, allowNull: true }
  });
  return NflSurvivorEntries;
};