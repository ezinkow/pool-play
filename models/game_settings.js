module.exports = (sequelize, DataTypes) => {
    const GameSettings = sequelize.define("GameSettings", {
        game_key: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        game_label: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        // ✨ NEW SCHEMA EXPANSIONS FOR FULL DYNAMIC PRESENTATION
        emoji: {
            type: DataTypes.STRING,
            allowNull: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        route: {
            type: DataTypes.STRING,
            allowNull: true
        },
        accent: {
            type: DataTypes.STRING,
            allowNull: true
        },
        cta_bg: {
            type: DataTypes.STRING,
            allowNull: true
        },
        title_color: {
            type: DataTypes.STRING,
            allowNull: true
        },
        prefix: {
            type: DataTypes.STRING,
            allowNull: true // Stores strings like "/worldcup", "/nba", "/tourneypickem"
        },
        short_label: {
            type: DataTypes.STRING,
            allowNull: true // Stores short display identifiers like "WC", "NBA", "PK"
        },
        nav_bg: {
            type: DataTypes.STRING,
            allowNull: true // Stores exact hex tracking codes like "#13447a" or "#0a1628"
        },
        open_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        lock_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        games_api_path: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: "game_settings",
        timestamps: true
    });

    return GameSettings;
};