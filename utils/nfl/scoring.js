function calculateFantasyPoints(p) {
  return (
    (p.passingYards || 0) * 0.04 +
    (p.passingTouchdowns || 0) * 4 +
    (p.interceptions || 0) * -2 +
    (p.rushingYards || 0) * 0.1 +
    (p.rushingTouchdowns || 0) * 6 +
    (p.receivingYards || 0) * 0.1 +
    (p.receivingTouchdowns || 0) * 6 +
    (p.receptions || 0) * 1
  );
}

module.exports = { calculateFantasyPoints };
