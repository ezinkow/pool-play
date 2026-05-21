const { NflStartingRosters, NflPlayerPools } = require("../../models");

const ROUND_DEADLINES = {
  1: new Date("2026-01-10T23:00:00Z"),
  2: new Date("2026-01-17T21:30:00Z"),
  3: new Date("2026-01-25T20:00:00Z"),
  4: new Date("2026-02-08T23:30:00Z"),
};

let cachedData = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

module.exports = function (app) {
  // GET all rosters (with caching)
  app.get("/api/nfl/startingrosters", async (req, res) => {
    try {
      if (cachedData && Date.now() - lastFetch < CACHE_TTL) {
        return res.json(cachedData);
      }

      const rosters = await NflStartingRosters.findAll({
        order: [["name", "ASC"], ["round", "ASC"], ["slot", "ASC"]],
        raw: true,
      });

      const playerNames = [...new Set(rosters.map(r => r.player_name))];

      const pools = await NflPlayerPools.findAll({
        where: { player_name: playerNames },
        raw: true,
      });

      const poolMap = {};
      pools.forEach(p => (poolMap[p.player_name] = p));

      const merged = rosters.map(r => {
        const pool = poolMap[r.player_name] || {};
        return {
          ...r,
          wild_card_score: Number(pool.wild_card_score || 0),
          divisional_score: Number(pool.divisional_score || 0),
          conf_championship_score: Number(pool.conf_championship_score || 0),
          super_bowl_score: Number(pool.super_bowl_score || 0),
          eliminated: pool.eliminated || null,
        };
      });

      cachedData = merged;
      lastFetch = Date.now();

      res.json(merged);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load scoreboard" });
    }
  });

  // GET my roster for a round
  app.get("/api/nfl/startingrosters/my", async (req, res) => {
    try {
      const { name, round } = req.query;
      const r = Number(round);

      if (!name || !r || !ROUND_DEADLINES[r]) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const roster = await NflStartingRosters.findAll({
        where: { name, round: r },
        raw: true,
      });

      res.json(roster);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load roster" });
    }
  });

  // POST new roster (first-time submission)
  app.post("/api/nfl/startingrosters", async (req, res) => {
    try {
      const entries = req.body;
      const { name, round } = entries[0];
      const r = Number(round);

      if (new Date() > ROUND_DEADLINES[r]) {
        return res.status(403).json({ error: "Roster locked for this round" });
      }

      const existing = await NflStartingRosters.findOne({ where: { name, round: r } });
      if (existing) {
        return res.status(409).json({ error: "Roster already submitted for this round" });
      }

      await NflStartingRosters.bulkCreate(entries);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit roster" });
    }
  });

  // PUT to update roster (edit before deadline)
  app.put("/api/nfl/startingrosters", async (req, res) => {
    try {
      const entries = req.body;
      const { name, round } = entries[0];
      const r = Number(round);

      if (new Date() > ROUND_DEADLINES[r]) {
        return res.status(403).json({ error: "Roster locked for this round" });
      }

      // Delete old entries for this user/round
      await NflStartingRosters.destroy({ where: { name, round: r } });

      // Insert new/updated entries
      await NflStartingRosters.bulkCreate(entries);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update roster" });
    }
  });
};
