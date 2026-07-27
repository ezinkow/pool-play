module.exports = function (sequelize, DataTypes) {
    const NflBtsTeamAssignments = sequelize.define("NflBtsTeamAssignments", {
        room_id: {
            type: DataTypes.STRING,
            defaultValue: "room_1",
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        team_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        division: {
            type: DataTypes.STRING, // e.g., "NFC North", "AFC East"
            allowNull: false
        }
    }, {
        tableName: "nfl_bts_team_assignments",
        timestamps: true
    });

    return NflBtsTeamAssignments;
};