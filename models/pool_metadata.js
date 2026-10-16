module.exports = function (sequelize, DataTypes) {
    const PoolMetadata = sequelize.define("PoolMetadata", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        game_key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        // --- Content & Text Elements ---
        pool_title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        pool_description: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        emoji: {
            type: DataTypes.STRING(5),
            allowNull: false,
            unique: true,
        },
        rules_html: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        // --- Theme & Branding Customization ---
        accent_color: {
            type: DataTypes.STRING(50),
            defaultValue: "#013369", // Primary brand border/header color
        },
        nav_bg_color: {
            type: DataTypes.STRING(50),
            defaultValue: "#13447a",
        },

        // --- Feature Flags (JSON or individual flags) ---
        // Storing feature flags cleanly lets components decide which sub-nav buttons to display
        features: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {
                has_picks: true,
                has_my_picks: true,
                has_group_picks: true,
                has_standings: true,
                has_best_bets: true,
                has_must_picks: true
            }
        }
    }, {
        tableName: "pool_metadata",
        timestamps: true,
    });

    return PoolMetadata;
};