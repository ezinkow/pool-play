require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

// ── 1. IMPORT DATABASE OBJECT FIRST ──────────────────────────────────────────
const db = require("./models");

// ── 2. INITIALIZE SYNCHRONIZATION MATRIX ─────────────────────────────────────
// NOTE: Turn force: false and alter: false once your tables create so you don't drop data!
db.sequelize.sync({ force: false, alter: true }).then(() => {
  console.log("🟩 Database tables verified / created successfully.");

  // ── 3. MOVED INSIDE: Routes only load AFTER tables exist ────────────────────

  // Shared auth (single login for all games)
  require("./routes/shared/auth-api-routes.js")(app);

  require("./routes/shared/gamesettings-api-routes.js")(app);
  require("./routes/shared/myaccount-api-routes.js")(app);
  require("./routes/shared/comments-api-routes.js")(app);
  require("./routes/shared/banter-api-routes.js")(app);

  //Champ Week
  require("./routes/champweek_pickem/picks-api-routes.js")(app);
  require("./routes/champweek_pickem/games-api-routes.js")(app);
  require("./routes/champweek_pickem/entries-api-routes.js")(app);
  require("./routes/champweek_pickem/standings-api-routes.js")(app);
  require("./routes/champweek_pickem/scoreboard-api-routes.js")(app);
  require("./routes/champweek_pickem/adminRefreshGames.js")(app);
  require("./routes/champweek_pickem/picksdisplay-api-routes.js")(app);
  require("./routes/champweek_pickem/tiebreaker-api-routes.js")(app);

  // Bracket
  require("./routes/bracket/picks-api-routes.js")(app);
  require("./routes/bracket/games-api-routes.js")(app);
  require("./routes/bracket/entries-api-routes.js")(app);
  require("./routes/bracket/standings-api-routes.js")(app);
  require("./routes/bracket/scoreboard-api-routes.js")(app);
  require("./routes/bracket/adminRefreshGames.js")(app);
  require("./routes/bracket/picksdisplay-api-routes.js")(app);
  require("./routes/bracket/tiebreaker-api-routes.js")(app);

  // Tourney Pickem
  require("./routes/tourney_pickem/picks-api-routes.js")(app);
  require("./routes/tourney_pickem/games-api-routes.js")(app);
  require("./routes/tourney_pickem/entries-api-routes.js")(app);
  require("./routes/tourney_pickem/standings-api-routes.js")(app);
  require("./routes/tourney_pickem/scoreboard-api-routes.js")(app);
  require("./routes/tourney_pickem/adminRefreshGames.js")(app);
  require("./routes/tourney_pickem/picksdisplay-api-routes.js")(app);

  // Tourney Squares
  require("./routes/tourney_squares/entries-api-routes.js")(app);
  require("./routes/tourney_squares/grid-api-routes.js")(app);

  // NBA
  require("./routes/nba/entries-api-routes.js")(app);
  require("./routes/nba/series-api-routes.js")(app);
  require("./routes/nba/picks-api-routes.js")(app);
  require("./routes/nba/standings-api-routes.js")(app);
  require("./routes/nba/tiebreaker-api-routes.js")(app);
  require("./routes/nba/admin-api-routes.js")(app);

  // NFL
  require("./routes/nfl/rosters-api-routes.js")(app);
  require("./routes/nfl/playerpools-api-routes.js")(app);
  require("./routes/nfl/entries-api-routes.js")(app);
  require("./routes/nfl/standings-api-routes.js")(app);
  require("./routes/nfl/startingrosters-api-routes.js")(app);
  require("./routes/nfl/gamestates-api-routes.js")(app);

  // Olympics
  require("./routes/olympics/countrypools-api-routes")(app);
  require("./routes/olympics/entries-api-routes.js")(app);
  require("./routes/olympics/rosterpicks-api-routes.js")(app);
  require("./routes/olympics/standings-api-routes")(app);
  require("./routes/olympics/scoreboard-api-routes")(app);
  require("./routes/olympics/news-api-routes")(app);
  require("./routes/olympics/medaltable-api-routes")(app);

  // World Cup
  require("./routes/world_cup/matches-api-routes.js")(app);
  require("./routes/world_cup/entries-api-routes.js")(app);
  require("./routes/world_cup/gamestates-api-routes.js")(app);
  require("./routes/world_cup/picks-api-routes.js")(app);
  require("./routes/world_cup/standings-api-routes.js")(app);

  // ── 4. MOVED INSIDE: Background jobs can safely execute query sets ────────
  const syncTourneyPickem = require("./syncs/tourney_pickem/sync.js");
  const syncBracket = require("./syncs/bracket/sync.js");
  const syncNba = require("./syncs/nba/sync.js");
  const syncWorldCup = require("./syncs/world_cup/sync.js");
  const tourneyPickemLockLines = require("./jobs/tourney_pickem/lockLines.js");

  async function runSync() {
    try {
      await syncNba();
      await syncWorldCup();
    } catch (err) {
      console.error("Background job failed:", err);
    }
  }

  runSync();
  setInterval(runSync, 10 * 60 * 1000);

  if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
    });
  }

  // ── 5. START SERVER LISTENER ───────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`App listening on PORT ${PORT}`);
  });
}).catch(err => {
  console.error("❌ Database sync step structurally failed:", err);
});