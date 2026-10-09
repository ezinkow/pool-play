module.exports = (sequelize, DataTypes) => {
  const NflSurvivorSecondChanceEntries = sequelize.define("NflSurvivorSecondChanceEntries", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    entry_name: { type: DataTypes.STRING, allowNull: false },
    is_eliminated: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminated_week: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: "nfl_survivor_secondchance_entries",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  });

  NflSurvivorSecondChanceEntries.associate = (models) => {
    NflSurvivorSecondChanceEntries.hasMany(models.NflSurvivorPicks, {
      foreignKey: "user_id",
      sourceKey: "user_id" // 👈 Reference the primary id key
    });
  };
  return NflSurvivorSecondChanceEntries;
};