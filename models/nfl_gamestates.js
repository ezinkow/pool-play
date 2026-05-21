module.exports = (sequelize, DataTypes) => {
  const NflGameStates = sequelize.define("NflGameStates", {
    current_round: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: "nfl_gamestates",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: false,
  });

  return NflGameStates;
};
