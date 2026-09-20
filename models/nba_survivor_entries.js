module.exports = (sequelize, DataTypes) => {
  const NbaSurvivorEntries = sequelize.define("NbaSurvivorEntries", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    entry_name: { type: DataTypes.STRING, allowNull: false },
    is_eliminated: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminated_week: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: "nba_survivor_entries",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  });

  NbaSurvivorEntries.associate = (models) => {
    NbaSurvivorEntries.hasMany(models.NbaSurvivorPicks, {
      foreignKey: "user_id",
      sourceKey: "user_id" // 👈 Reference the primary id key
    });
  };
  return NbaSurvivorEntries;
};