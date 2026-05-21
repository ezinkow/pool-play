const express = require("express");
const { NflPlayerStats } = require("../../models");

const router = express.Router();

router.get("/api/nfl/scoreboard", async (req, res) => {
  const players = await NflPlayerStats.findAll();
  res.json(players);
});

module.exports = router;
