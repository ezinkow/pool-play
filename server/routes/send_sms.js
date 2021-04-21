// const express = require('express')
// const router = express.Router()

// const client = require('twilio')(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// router.post('/messages', (req, res) => {
//   console.log('req body', req.body)
//   res.header('Content-Type', 'application/json');
//   client.messages
//     .create({
//       from: '+14439687001',
//       to: req.body.messageTo,
//       body: req.body.messageBody
//     })
//     .then(() => {
//       res.send({ success: true });
//     })
//     .catch(err => {
//       console.log(err);
//       res.send({ success: false });
//     });
// });

// module.exports = router