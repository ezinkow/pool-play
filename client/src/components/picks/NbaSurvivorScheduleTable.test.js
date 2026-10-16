import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import NbaSurvivorScheduleTable from "./NbaSurvivorScheduleTable";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("NbaSurvivorScheduleTable", () => {
  test("renders matchup details and sends the selected team to its handler", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onSelectTeam = jest.fn();
    const futureFriday = new Date();
    while (futureFriday.getDay() !== 5) {
      futureFriday.setDate(futureFriday.getDate() + 1);
    }
    futureFriday.setDate(futureFriday.getDate() + 14);
    futureFriday.setHours(23, 59, 0, 0);

    await act(async () => {
      root.render(
        <NbaSurvivorScheduleTable
          games={[{
            id: 42,
            home_team: "Boston",
            away_team: "New York",
            game_date: futureFriday.toISOString(),
            spread: 4.5,
            favorite: "Boston",
            home_logo: "/boston.png",
            away_logo: "/new-york.png"
          }]}
          teamColors={{
            Boston: { primaryColor: "#008348", record: "3-1" },
            "New York": { primaryColor: "#006bb6", record: "2-2" }
          }}
          currentWeekPick={null}
          usedTeams={[]}
          onSelectTeam={onSelectTeam}
        />
      );
    });

    expect(container.textContent).toContain("Boston");
    expect(container.textContent).toContain("New York");
    expect(container.textContent).toContain("-4.5");

    await act(async () => {
      container.querySelector("tbody tr").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onSelectTeam).toHaveBeenCalledWith(
      "Boston",
      expect.objectContaining({ Fri: expect.objectContaining({ gameId: 42 }) }),
      false,
      false
    );
    await act(async () => root.unmount());
  });
});
