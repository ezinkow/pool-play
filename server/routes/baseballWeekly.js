const express = require('express')
const router = express.Router()
const { BaseballWeekly, User } = require('../database/models')
const mongoose = require('mongoose');

// Gets all picks
router.get('/baseballweekly', function (req, res) {
    BaseballWeekly.find({})
        .then((bw) => {
            console.log(bw);
            res.send(bw);
        });
});

//Gets one job by id
/*
router.get('/job/:id', (req, res) => {
    console.log('getting one job by job id', req.params.id);

    Job.findOne({
        _id: mongoose.Types.ObjectId(req.params.id)
    }).populate('poster')
    .populate('shoveler')
    .then(job => {
        console.log(job);
        res.json(job);
    })
    .catch(err => {
        console.error(err);
    });
});
*/

//Gets all jobs by user id
/*
router.get('/user/jobs', (req, res) => {
    console.log('getting jobs by user');

    User.findOne({
        _id: mongoose.Types.ObjectId(req.user._id)
    }).populate('jobs')
        .then(user => {
            res.json(user);
        })
        .catch(e => {
            console.error(e);
        });
});
*/

// Creates a new pickset
router.post('/baseballweekly', (req, res) => {
    const { name, picks } = req.body
    console.log(name, picks[0].value)
    BaseballWeekly.create([
        { name: name },
        {
            game: game,
            pick: picks[0].value,
            id: picks[0].id
        },
        // game2: picks[1].value,
        // game3: picks[2].value,
        // game4: picks[3].value,
        // game5: picks[4].value,
        // game6: picks[5].value,
        // game7: picks[6].value,
        // game8: picks[7].value,
        // game9: picks[8].value,
        // game10: picks[9].value,
        // game11: picks[10].value,
        // game12: picks[11].value,
        // game13: picks[12].value,
        // game14: picks[13].value,
        // game15: picks[14].value
    ])
        .then((picks) => {
            console.log(picks);
            res.send(picks);
        });
})

//Updates one job with any field(s)
// router.put('/job/:id', (req, res) => {
//     Job.findOneAndUpdate({
//         _id: mongoose.Types.ObjectId(req.params.id)
//     }, req.body, { new: true })
//         .then(response => {
//             res.json(response);
//         })
//         .catch(e => console.error(e));
// });



module.exports = router;