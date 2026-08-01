module.exports = (sequelize, DataTypes) => {
    const NflSurvivorPicks = sequelize.define("NflSurvivorPicks", {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        week: { type: DataTypes.INTEGER, allowNull: false },
        team_name: { type: DataTypes.STRING, allowNull: false },
        status: { type: DataTypes.STRING, defaultValue: "pending" } // 'pending', 'win', 'loss'
    });
    return NflSurvivorPicks;
};