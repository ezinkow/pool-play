import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import PoolLoginPrompt from "./components/PoolLoginPrompt";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("renders account links for joining a pool", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <PoolLoginPrompt />
      </MemoryRouter>
    );
  });

  expect(container.textContent).toContain("Account Required to Join Pool");
  expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  expect(container.querySelector('a[href="/signup"]')).not.toBeNull();

  await act(async () => root.unmount());
});
