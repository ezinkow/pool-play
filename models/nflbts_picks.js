module.exports = function (sequelize, DataTypes) {
    const NflBtsPicks = sequelize.define("NflBtsPicks", {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        week: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        team_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ats_pick: {
            type: DataTypes.STRING, // The team they picked to cover
            allowNull: true
        },
        ou_pick: {
            type: DataTypes.STRING, // "Over" or "Under"
            allowNull: true
        },
        ats_status: {
            type: DataTypes.STRING, // "win", "loss", "push", or null (pending)
            allowNull: true
        },
        ou_status: {
            type: DataTypes.STRING, // "win", "loss", "push", or null
            allowNull: true
        }
    }, {
        tableName: "nfl_bts_picks",
        timestamps: true
    });

    return NflBtsPicks;
};