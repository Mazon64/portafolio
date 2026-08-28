import { describe, expect, it } from "vitest";
import { formatDateRange } from "./format-date-range";

describe("formatDateRange", () => {
  it("formats an open Spanish range in UTC", () => {
    expect(formatDateRange("2024-01-31", null, "es")).toBe(
      "enero de 2024 - Actualidad",
    );
  });

  it("formats a closed English range", () => {
    expect(formatDateRange("2023-09-01", "2024-02-29", "en")).toBe(
      "September 2023 - February 2024",
    );
  });

  it.each(["2024-02-30", "01/31/2024", "not-a-date"])(
    "rejects invalid date-only value %s",
    (value) => {
      expect(() => formatDateRange(value, null, "en")).toThrow(RangeError);
    },
  );
});
