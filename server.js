require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const cron = require('node-cron');

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
db.sequelize.sync({ force: false, alter: false }).then(() => {
  // ── 3. MOVED INSIDE: Routes only load AFTER tables exist ────────────────────

  // Shared auth (single login for all games)
  require("./routes/shared/auth-api-routes.js")(app);

  require("./routes/shared/gamesettings-api-routes.js")(app);
  require("./routes/shared/myaccount-api-routes.js")(app);
  require("./routes/shared/comments-api-routes.js")(app);
  require("./routes/shared/banter-api-routes.js")(app);
  require("./routes/shared/admin-api-routes.js")(app);

  // Bracket
  require("./routes/bracket/picks-api-routes.js")(app);
  require("./routes/bracket/games-api-routes.js")(app);
  require("./routes/bracket/entries-api-routes.js")(app);
  require("./routes/bracket/standings-api-routes.js")(app);
  require("./routes/bracket/scoreboard-api-routes.js")(app);
  require("./routes/bracket/adminRefreshGames.js")(app);
  require("./routes/bracket/picksdisplay-api-routes.js")(app);
  require("./routes/bracket/tiebreaker-api-routes.js")(app);

  // CFB Pickem
  require("./routes/cfb_ats_api_routes.js")(app);

  // CFB Bowl Confidence Pickem
  require("./routes/cfb_bowl_confidence.js")(app);

  // Champ Week
  require("./routes/champweek_pickem/picks-api-routes.js")(app);
  require("./routes/champweek_pickem/games-api-routes.js")(app);
  require("./routes/champweek_pickem/entries-api-routes.js")(app);
  require("./routes/champweek_pickem/standings-api-routes.js")(app);
  require("./routes/champweek_pickem/scoreboard-api-routes.js")(app);
  require("./routes/champweek_pickem/adminRefreshGames.js")(app);
  require("./routes/champweek_pickem/picksdisplay-api-routes.js")(app);
  require("./routes/champweek_pickem/tiebreaker-api-routes.js")(app);

  // Home Run Derby
  require("./routes/hrd_api_routes.js")(app);

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

  // NBA Regular Season
  require("./routes/nba_regular_season_api_routes.js")(app);

  // NBA Survivor
  require("./routes/nba_survivor_api_routes.js")(app);

  // NFL
  require("./routes/nfl/rosters-api-routes.js")(app);
  require("./routes/nfl/playerpools-api-routes.js")(app);
  require("./routes/nfl/entries-api-routes.js")(app);
  require("./routes/nfl/standings-api-routes.js")(app);
  require("./routes/nfl/startingrosters-api-routes.js")(app);
  require("./routes/nfl/gamestates-api-routes.js")(app);

  // NFL Regular Season Games
  require("./routes/nfl_regular_season_api_routes.js")(app);

  // NFL ATS
  require("./routes/nfl_ats_api_routes.js")(app);

  // NFL BTS
  require("./routes/nfl_bts_api_routes.js")(app);

  // NFL Survivor
  require("./routes/nfl_survivor_api_routes.js")(app);

  // MLB
  require("./routes/mlb_playoffs_api_routes.js")(app);

  // Olympics
  require("./routes/olympics_api_routes.js")(app);

  // World Cup
  require("./routes/world_cup_api_routes.js")(app);

  // ── 4. MOVED INSIDE: Background jobs can safely execute query sets ────────
  const syncTourneyPickem = require("./syncs/ncaa_tourney/sync.js");
  const syncChampWeekPickem = require("./syncs/ncaa_champweek/sync.js");
  const syncBracket = require("./syncs/ncaa_bracket/sync.js");
  const syncHrd = require("./syncs/mlb_season/sync.js");
  const syncNba = require("./syncs/nba_playoffs/sync.js");
  const syncMlbPlayoffs = require("./syncs/mlb_playoffs/sync.js");
  const syncNflRegSeason = require("./syncs/nfl_season/sync.js");
  const syncCfbRegSeason = require("./syncs/cfb_season/sync.js");
  const syncCfbBowlSeason = require("./syncs/cfb_bowl_season/sync.js");
  const syncNbaRegSeason = require("./syncs/nba_season/sync.js");
  const syncWorldCup = require("./syncs/world_cup/sync.js");


  //move this to sync
  const tourneyPickemLockLines = require("./jobs/tourney_pickem/lockLines.js");

  // Add SyncStatus model import or access it via db.SyncStatus

  async function runSync() {
    try {
      // 1. Define sync tasks mapping exact database sync_file_route strings to runner functions
      const syncTasks = [
        { route: "ncaa_tourney", run: syncTourneyPickem },
        { route: "ncaa_champweek", run: syncChampWeekPickem }, // Added if you want champweek synced
        { route: "bracket", run: syncBracket },                 // Ensure a row exists in DB for this if used
        { route: "mlb_home_run_derby", run: syncHrd },          // Fixed from "hrd"
        { route: "nba_playoffs", run: syncNba },
        { route: "mlb_playoffs", run: syncMlbPlayoffs },
        { route: "nfl_season", run: syncNflRegSeason },
        { route: "nba_season", run: syncNbaRegSeason },
        { route: "cfb_season", run: syncCfbRegSeason },
        { route: "cfb_bowl_season", run: syncCfbBowlSeason },
        { route: "world_cup", run: syncWorldCup },              // Ensure a row exists in DB for this if used
        { route: "tourney_lock_lines", run: tourneyPickemLockLines }, // Ensure a row exists if used
      ];

      // 2. Fetch all sync control records in a single query
      const syncStatuses = await db.SyncStatus.findAll();
      const statusMap = {};
      syncStatuses.forEach(s => {
        statusMap[s.sync_file_route] = s;
      });

      // 3. Iterate and evaluate whether each sync is enabled
      for (const task of syncTasks) {
        const record = statusMap[task.route];

        // If a configuration record exists, check if it's enabled
        if (record) {
          const isEnabled = record.sync_enabled === true || record.sync_enabled === 1;

          if (!isEnabled) {
            continue; // Skip this sync if toggled off in the admin dashboard
          }
        } else {
          // Skip if no row exists in the database for this route yet
          continue;
        }

        try {
          await task.run();
        } catch (taskErr) {
          console.error(`Sync execution failed for [${task.route}]:`, taskErr.message);
        }
      }
    } catch (err) {
      console.error("Background job batch failed:", err);
    }
  }

  //run on startup
  runSync();

  cron.schedule('0,02,05,10,20,30,40,50 * * * *', () => {
    runSync();
  });

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