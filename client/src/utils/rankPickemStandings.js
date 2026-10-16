export default function rankPickemStandings(standings) {
  const sorted = [...standings].sort((a, b) =>
    (Number(b.total_points) || 0) - (Number(a.total_points) || 0)
    || (a.entry_name || "").localeCompare(b.entry_name || "")
  );

  let currentRank = 1;
  let previousPoints;

  return sorted.map((entry, index) => {
    const points = Number(entry.total_points) || 0;
    if (index === 0 || points !== previousPoints) {
      currentRank = index + 1;
    }
    previousPoints = points;
    return { ...entry, rank: currentRank };
  });
}
