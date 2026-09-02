import { describe, expect, it } from "vitest";

import {
  dateToMonth,
  isMonthValue,
  monthToEndDate,
  monthToStartDate,
} from "./month-date";

describe("month date helpers", () => {
  it("validates browser month values", () => {
    expect(isMonthValue("2026-09")).toBe(true);
    expect(isMonthValue("2026-13")).toBe(false);
    expect(isMonthValue("2026-09-01")).toBe(false);
  });

  it("normalizes months to UTC boundaries", () => {
    expect(monthToStartDate("2024-02").toISOString()).toBe(
      "2024-02-01T00:00:00.000Z",
    );
    expect(monthToEndDate("2024-02").toISOString()).toBe(
      "2024-02-29T00:00:00.000Z",
    );
    expect(monthToStartDate("0099-01").toISOString()).toBe(
      "0099-01-01T00:00:00.000Z",
    );
  });

  it("serializes dates without applying the local time zone", () => {
    expect(dateToMonth(new Date("2025-12-31T00:00:00.000Z"))).toBe("2025-12");
  });
});
