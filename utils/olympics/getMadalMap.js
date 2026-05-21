const fetch = require("node-fetch");

const ESPN_URL =
  "https://site.web.api.espn.com/apis/site/v2/olympics/winter/2026/medals?region=us&lang=en";

// points system — tweak if you want
const POINTS = {
  gold: 3,
  silver: 2,
  bronze: 1,
};

async function getMedalMap() {
  const res = await fetch(ESPN_URL);
  const data = await res.json();

  const medalMap = {};

  data.medals.forEach((c) => {
    const gold = c.medalStandings.goldMedalCount || 0;
    const silver = c.medalStandings.silverMedalCount || 0;
    const bronze = c.medalStandings.bronzeMedalCount || 0;

    medalMap[c.name] = {
      gold,
      silver,
      bronze,
      total: gold + silver + bronze,
      score:
        gold * POINTS.gold +
        silver * POINTS.silver +
        bronze * POINTS.bronze,
    };
  });

  return medalMap;
}

module.exports = getMedalMap;
