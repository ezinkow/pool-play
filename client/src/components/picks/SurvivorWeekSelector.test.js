import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import SurvivorWeekSelector from "./SurvivorWeekSelector";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("allows available weeks and disables weeks beyond the availability limit", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const onWeekChange = jest.fn();

  await act(async () => {
    root.render(
      <SurvivorWeekSelector
        currentWeek={1}
        maxAvailableWeek={2}
        totalWeeks={3}
        onWeekChange={onWeekChange}
      />
    );
  });

  const [currentWeek, availableWeek, unavailableWeek] = container.querySelectorAll("button");

  expect(currentWeek.textContent).toBe("Week 1");
  expect(availableWeek.textContent).toBe("Week 2");
  expect(unavailableWeek.textContent).toBe("Week 3");
  expect(availableWeek).not.toBeNull();
  expect(unavailableWeek).not.toBeNull();
  expect(unavailableWeek.disabled).toBe(true);

  await act(async () => availableWeek.click());
  expect(onWeekChange).toHaveBeenCalledWith(2);

  await act(async () => unavailableWeek.click());
  expect(onWeekChange).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
});
