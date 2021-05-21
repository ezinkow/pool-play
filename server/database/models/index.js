const User = require('./user');
const BaseballWeekly = require('./baseballWeekly');
const NbaPlayoffs21 = require('./nbaplayoffs21');

const db = {
    User, 
    BaseballWeekly,
    NbaPlayoffs21
};

module.exports = db;