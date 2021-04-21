const express = require("express");
const path = require('path')
const mongoose = require("mongoose");
const morgan = require('morgan')
// const session = require('express-session')
// const passport = require('./server/passport');
const PORT = process.env.PORT || 3001;
const app = express();
// require('dotenv').config({ path: path.resolve(__dirname, './server/.env') })

// Route requires
const user = require('./server/routes/user')
const baseballWeekly = require('./server/routes/baseballWeekly')
const send_sms = require('./server/routes/send_sms')

// MIDDLEWARE
app.use(morgan('dev'))
app.use(
	express.urlencoded({
		extended: false
	})
)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (process.env.NODE_ENV === "production") {
	app.use(express.static("client/build"));
  }
  
  // Connect to the Mongo DB
  mongoose.connect(
	process.env.MONGODB_URI || "mongodb://localhost/pool-play",
	{ useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }
  );


// routes
app.use('/user', user)
app.use('/api', baseballWeekly)
// app.use('/sms', send_sms)

// Send every request to the React app
// Define any API routes before this runs
app.get("*", function(req, res) {
	res.sendFile(path.join(__dirname, "./client/build/index.html"));
  });

app.listen(PORT, () => {
  console.log(`🌎 ==> API server now on port ${PORT}!`);
});
