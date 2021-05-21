const mongoose = require('mongoose');
const { Schema } = mongoose;

const NbaPlayoffs21Schema = new Schema({

    name: {
        type: String,
        // required: true
    },
    picks: [{
        teamName: {
            type: String,
            // required: true
        },
        points: {
            type: Number,
            // required: true
        },
        games: {
            type: Number,
            // required: true
        }
    }]
})

const NbaPlayoffs21 = mongoose.model('NbaPlayoffs21', NbaPlayoffs21Schema)
module.exports = NbaPlayoffs21;