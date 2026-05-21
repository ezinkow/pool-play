module.exports = function (sequelize, DataTypes) {
    const NflPlayerPools = sequelize.define("NflPlayerPools", {
        player_name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        team: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        position: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        tier: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        eliminated: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        wild_card_score: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        divisional_score: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        conf_championship_score: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        super_bowl_score: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        times_selected: {
            type: DataTypes.TEXT,
            allowNull: true,
        }
    }, {
        tableName: "nfl_player_pools",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
    });

    return NflPlayerPools;
};
