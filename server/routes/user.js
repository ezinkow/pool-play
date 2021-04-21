const express = require('express')
const router = express.Router()
const User = require('../database/models/user')
const passport = require('../passport')

router.get('/info', (req, res) => {
    User.find({
        _id: req.user._id
    }, (err, user) => {
        if (err) console.error(err);
        res.json(user);
    })
})

router.post('/', (req, res) => {
    console.log('user signup');

    const { username, password, firstName, lastName, phone } = req.body
    // ADD VALIDATION
    User.findOne({ username: username }, (err, user) => {
        if (err) {
            console.log('User.js post error: ', err)
        } else if (user) {
            res.json({
                error: `Sorry, already a user with the username: ${username}`
            })
        }
        else {
            const newUser = new User({
                username: username,
                password: password,
                firstName: firstName,
                lastName: lastName,
                phone: phone
            })
            newUser.save((err, savedUser) => {
                if (err) return res.json(err)
                console.log(savedUser);
                res.redirect(307, '/user/login');
            })
        }
    })
})

router.post(
    '/login',
    function (req, res, next) {
        console.log('routes/user.js, login, req.body: ');
        console.log(req.body)
        next()
    },
    passport.authenticate('local'),
    (req, res) => {
        console.log('logged in', req.user);
        var userInfo = {
            username: req.user.username
        };
        res.send(userInfo);
    }
)

router.get('/', (req, res, next) => {
    console.log('===== user!!======')
    console.log(req.user)
    if (req.user) {
        res.json({ user: req.user })
    } else {
        res.json({ user: null })
    }
})

router.post('/logout', (req, res) => {
    if (req.user) {
        req.logout()
        res.send({ msg: 'logging out' })
    } else {
        res.send({ msg: 'no user to log out' })
    }
})

module.exports = router