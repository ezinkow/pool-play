'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const env = (process.env.NODE_ENV || 'development').trim();

const configPath = path.join(__dirname, '..', 'config', 'config.json');
const config = require(configPath)[env];
const db = {};

let sequelize;

// FIX: If JAWSDB_URL exists (Heroku), use it. Otherwise, use local config.
if (process.env.JAWSDB_URL) {
    sequelize = new Sequelize(process.env.JAWSDB_URL, {
        logging: false,
        dialect: 'mysql'
    });
} else {
    sequelize = new Sequelize(config.database, config.username, config.password, {
        ...config,
        logging: false
    });
}

const modelDir = __dirname;

fs.readdirSync(modelDir)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
    })
    .forEach(file => {
        const model = require(path.join(modelDir, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) db[modelName].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;