module.exports = (sequelize, DataTypes) => {
  const NflSurvivorEntries = sequelize.define("NflSurvivorEntries", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    entry_name: { type: DataTypes.STRING, allowNull: false },
    is_eliminated: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminated_week: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: "nfl_survivor_entries",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  });

  NflSurvivorEntries.associate = (models) => {
    NflSurvivorEntries.hasMany(models.NflSurvivorPicks, {
      foreignKey: "user_id",
      sourceKey: "id" // 👈 Reference the primary id key
    });
  };
  return NflSurvivorEntries;
};