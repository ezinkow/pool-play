const express = require("express");
const { fetchScoreboard, fetchGameSummary } = require("../../utils/nfl/espn");
const { normalizePlayer } = require("../../utils/nfl/normalizeStats");
const { calculateFantasyPoints } = require("../../utils/nfl/scoring");
const { PlayerStats } = require("../../models");

const router = express.Router();

router.post("/nfl/ingest", async (req, res) => {
  try {
    const events = await fetchScoreboard();
    let saved = 0;

    for (const event of events) {
      const summary = await fetchGameSummary(event.id);

      for (const team of summary.boxscore.players) {
        for (const group of team.statistics) {
          const labels = group.labels;

          for (const athlete of group.athletes) {
            const player = normalizePlayer(athlete, labels);
            const fantasyPoints = calculateFantasyPoints(player);

            await PlayerStats.upsert({
              espn_id: player.espn_id,
              name: player.name,
              team: player.team,
              position: player.position,
              fantasy_points: fantasyPoints,
            });

            saved++;
          }
        }
      }
    }

    res.json({ success: true, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

module.exports = router;
