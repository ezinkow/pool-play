const express = require('express')
const router = express.Router()
const { NbaPlayoffs21, User } = require('../database/models')
const mongoose = require('mongoose');

// Gets all picks
router.get('/nbaplayoffs21', function (req, res) {
    NbaPlayoffs21.find({})
        .then((bw) => {
            console.log(bw);
            res.send(bw);
        });

});

// Post picks
router.post('/nbaplayoffs21', (req, res) => {
    const { name, picks } = req.body
    console.log(name, picks)
    NbaPlayoffs21.create([
        {name},   
        {
            picks:[picks]
        }
    ])
    .then((picks)=>{
        console.log(picks)
        res.send(picks)
    })
})

module.exports = router;