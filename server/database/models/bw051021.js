const mongoose = require('mongoose');
const { Schema } = mongoose;

const bw051021Schema = new Schema({

    id: {
        type: String,
        required: true
    },
    game: {
        type: String,
        required: true
    },
    homeTeam: {
        type: String,
        required: true
    },
    awayTeam: {
        type: String,
        required: true
    },
    favorite: {
        type: String,
        required: true
    },
    line: {
        type: Number,
        required: true
    }
})

const bw051021 = mongoose.model('bw051021', bw051021Schema)