module.exports = (sequelize, DataTypes) => {
    const PoolSettings = sequelize.define("PoolSettings", {
        game_key: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        game_label: {
            type: DataTypes.STRING,
            allowNull: false
        },
        sport: {
            type: DataTypes.STRING,
            allowNull: false
        },
        season: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        route: {
            type: DataTypes.STRING,
            allowNull: true
        },
        url_path: {
            type: DataTypes.STRING,
            allowNull: true // Stores strings like "/worldcup", "/nba", "/tourneypickem"
        },
        short_label: {
            type: DataTypes.STRING,
            allowNull: true // Stores short display identifiers like "WC", "NBA", "PK"
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
        },
        games_table: {
            type: DataTypes.STRING,
            allowNull: true
        },
        games_model_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        model_pattern: {
            type: DataTypes.STRING,
            allowNull: true
        },
        nav_links: {
            type: DataTypes.JSON,
            allowNull: true
        },
        credits: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        multi_entry: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    }, {
        tableName: "pool_settings",
        timestamps: true
    });

    return PoolSettings;
};