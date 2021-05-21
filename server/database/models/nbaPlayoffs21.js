const mongoose = require('mongoose');
const { Schema } = mongoose;

const picksSchema = {
    id: Number,
    teamName: String,
    points: Number,
    games: Number,
}

const NbaPlayoffs21Schema = new Schema({

    name: {
        type: String,
        // required: true
    },
    picks: [picksSchema]
})

const NbaPlayoffs21 = mongoose.model('NbaPlayoffs21', NbaPlayoffs21Schema)
module.exports = NbaPlayoffs21;