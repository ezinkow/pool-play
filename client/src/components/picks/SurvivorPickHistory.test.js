import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import SurvivorPickHistory from "./SurvivorPickHistory";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("SurvivorPickHistory", () => {
  test("renders selected teams, matchup scores and pick outcomes", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SurvivorPickHistory
          picks={[
            {
              week: 2,
              pickedTeam: "Boston",
              game: {
                away_team: "Boston",
                home_team: "New York",
                away_score: 104,
                home_score: 99,
                status: "final",
                winner: "Boston"
              }
            },
            { week: 3, pickedTeam: "Chicago", game: null }
          ]}
          teamColors={{ Boston: { primaryColor: "#008348", logo: "/boston.png" } }}
          emptyMessage="No selections."
        />
      );
    });

    expect(container.textContent).toContain("Week 2 Selection");
    expect(container.textContent).toContain("Boston @ New York");
    expect(container.textContent).toContain("Final: 104 - 99");
    expect(container.textContent).toContain("WIN (Advanced)");
    expect(container.textContent).toContain("Pending Game");
    expect(container.querySelector('img[alt="Boston logo"]')).not.toBeNull();

    await act(async () => root.unmount());
  });

  test("shows the configured empty state", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<SurvivorPickHistory picks={[]} teamColors={{}} emptyMessage="No picks yet." />);
    });

    expect(container.textContent).toContain("No picks yet.");
    await act(async () => root.unmount());
  });
});
