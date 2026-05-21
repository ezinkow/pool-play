const axios = require("axios");

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

async function fetchScoreboard() {
  const res = await axios.get(SCOREBOARD_URL);
  return res.data.events || [];
}

async function fetchGameSummary(eventId) {
  const res = await axios.get(SUMMARY_URL, {
    params: { event: eventId },
  });
  return res.data;
}

module.exports = { fetchScoreboard, fetchGameSummary };
