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
    // 2: {
    //     type: String,
    //     required: true
    // },
    // 3: {
    //     type: String,
    //     required: true
    // },
    // 4: {
    //     type: String,
    //     required: true
    // },
    // 5: {
    //     type: String,
    //     required: true
    // },
    // 6: {
    //     type: String,
    //     required: true
    // },
    // 7: {
    //     type: String,
    //     required: true
    // },
    // 8: {
    //     type: String,
    //     required: true
    // },
    // 9: {
    //     type: String,
    //     required: true
    // },
    // 10: {
    //     type: String,
    //     required: true
    // },
    // 11: {
    //     type: String,
    //     required: true
    // },
    // 12: {
    //     type: String,
    //     required: true
    // },
    // 13: {
    //     type: String,
    //     required: true
    // },
    // 14: {
    //     type: String,
    //     required: true
    // },
    // 15: {
    //     type: String,
    //     required: true
    // },
});

const BaseballWeekly = mongoose.model('BaseballWeekly', BaseballWeeklySchema);

module.exports = BaseballWeekly;