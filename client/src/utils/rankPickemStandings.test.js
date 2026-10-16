import rankPickemStandings from "./rankPickemStandings";

it("sorts by points, alphabetizes ties, and gives tied entries the same rank", () => {
  const standings = [
    { entry_name: "Charlie", total_points: 7 },
    { entry_name: "Zelda", total_points: "10" },
    { entry_name: "Alice", total_points: 7 },
    { entry_name: "Bob", total_points: 4 }
  ];

  expect(rankPickemStandings(standings)).toEqual([
    { entry_name: "Zelda", total_points: "10", rank: 1 },
    { entry_name: "Alice", total_points: 7, rank: 2 },
    { entry_name: "Charlie", total_points: 7, rank: 2 },
    { entry_name: "Bob", total_points: 4, rank: 4 }
  ]);
  expect(standings[0].rank).toBeUndefined();
});
