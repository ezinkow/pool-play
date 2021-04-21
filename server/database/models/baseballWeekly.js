const mongoose = require('mongoose');
const { Schema } = mongoose;

const BaseballWeeklySchema = new Schema({
    // user: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    name: {
        type: String,
        required: true
    },
    game1: {
        type: String,
        required: true
    },
    game2: {
        type: String,
        required: true
    },
    game3: {
        type: String,
        required: true
    },
    game4: {
        type: String,
        required: true
    },
    game5: {
        type: String,
        required: true
    },
    game6: {
        type: String,
        required: true
    },
    game7: {
        type: String,
        required: true
    },
    game8: {
        type: String,
        required: true
    },
    game9: {
        type: String,
        required: true
    },
    game10: {
        type: String,
        required: true
    },
    game11: {
        type: String,
        required: true
    },
    game12: {
        type: String,
        required: true
    },
    game13: {
        type: String,
        required: true
    },
    game14: {
        type: String,
        required: true
    },
    // game15: {
    //     type: String,
    //     required: true
    // },
});

const BaseballWeekly = mongoose.model('BaseballWeekly', BaseballWeeklySchema);

module.exports = BaseballWeekly;