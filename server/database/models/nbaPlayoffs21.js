const mongoose = require('mongoose');
const { Schema } = mongoose;

const nbaPlayoffs21Schema = new Schema({

    name: {
        type: String,
        required: true
    },
    game: {
        type: String,
        required: true
    },
    1: {
        
    }
})

const nbaPlayoffs21 = mongoose.model('nbaPlayoffs21', nbaPlayoffs21Schema)