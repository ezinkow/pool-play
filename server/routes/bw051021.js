const express = require('express')
const router = express.Router()
const { bw051021, User } = require('../database/models')
const mongoose = require('mongoose');

// Gets all games
router.get('/api/bw051021', function (req, res) {
    bw051021.find({})
        .then((bw) => {
            console.log(bw);
            res.send(bw);
        });
});