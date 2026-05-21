function normalizePlayer(player, statLabels) {
  const stats = {};
  statLabels.forEach((label, idx) => {
    stats[label] = Number(player.stats[idx] || 0);
  });

  return {
    espn_id: player.athlete.id,
    name: player.athlete.displayName,
    position: player.athlete.position?.abbreviation,
    team: player.athlete.team?.abbreviation,
    ...stats,
  };
}

module.exports = { normalizePlayer };
