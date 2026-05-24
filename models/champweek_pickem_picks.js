module.exports = (sequelize, DataTypes) => {
    const ChampWeekPickemPicks = sequelize.define('ChampWeekPickemPicks', {
        name: {
            type: DataTypes.STRING(255), // Explicit length for Indexing
            allowNull: false
        },
        game_id: {
            type: DataTypes.STRING(255), // Explicit length for Indexing
            allowNull: false
        },
        pick: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        game_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        missed_pick_flag: {
            type: DataTypes.BOOLEAN,
            defaultValue: false // New Boolean Flag
        }
    }, {
        tableName: "champweek_pickem_picks",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false, // Disables tracking updates structurally
        indexes: [
            {
                unique: true,
                fields: ['name', 'game_id'] // Composite Unique Key successfully registered!
            }
        ]
    });

    return ChampWeekPickemPicks;
};