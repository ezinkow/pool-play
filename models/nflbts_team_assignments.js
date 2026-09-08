module.exports = function (sequelize, DataTypes) {
    const NflBtsTeamAssignments = sequelize.define("NflBtsTeamAssignments", {
        room_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        team_name_1: {
            type: DataTypes.STRING,
            allowNull: false
        },
        division_1: {
            type: DataTypes.STRING,
            allowNull: false
        },
        team_name_2: {
            type: DataTypes.STRING,
            allowNull: false
        },
        division_2: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: "nfl_bts_team_assignments",
        timestamps: true
    });

    return NflBtsTeamAssignments;
};