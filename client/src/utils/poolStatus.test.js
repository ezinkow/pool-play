import { isPoolStarted } from "./poolStatus";

describe("isPoolStarted", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  test("does not treat a missing pool as started", () => {
    expect(isPoolStarted(null, { now })).toBe(false);
  });

  test("treats inactive pools as started when activity is required", () => {
    expect(isPoolStarted({ is_active: false }, { now })).toBe(true);
  });

  test("treats a past lock date as started", () => {
    expect(isPoolStarted({
      is_active: true,
      lock_date: "2026-10-16 11:59:00"
    }, { now })).toBe(true);
  });

  test("keeps a future lock date open", () => {
    expect(isPoolStarted({
      is_active: true,
      lock_date: "2026-10-16T12:01:00Z"
    }, { now })).toBe(false);
  });

  test("supports pools that do not use the active flag", () => {
    expect(isPoolStarted({ is_active: false }, { now, requireActive: false })).toBe(false);
  });

  test("handles explicit timezone offsets without appending UTC", () => {
    expect(isPoolStarted({
      is_active: true,
      lock_date: "2026-10-16T06:00:00-06:00"
    }, { now })).toBe(true);
  });
});
