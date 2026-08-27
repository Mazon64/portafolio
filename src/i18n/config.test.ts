import { describe, expect, it } from "vitest";
import {
  detectLocale,
  getLocalizedUrl,
  hasLocale,
} from "./config";

describe("detectLocale", () => {
  it.each([
    ["es", "es"],
    ["es-MX,es;q=0.9,en;q=0.8", "es"],
    ["en-US,en;q=0.9,es;q=0.8", "en"],
    ["fr,es;q=0.8", "en"],
    ["es;q=0,en;q=0.5", "en"],
    [null, "en"],
  ])("maps %s to %s", (header, expected) => {
    expect(detectLocale(header)).toBe(expected);
  });
});

describe("locale validation", () => {
  it("accepts only supported locales", () => {
    expect(hasLocale("es")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("fr")).toBe(false);
  });

});

describe("getLocalizedUrl", () => {
  it("changes only the locale and preserves the rest of the URL", () => {
    expect(
      getLocalizedUrl("https://example.com/es?view=grid#projects", "en"),
    ).toBe("https://example.com/en?view=grid#projects");
    expect(getLocalizedUrl("https://example.com/en/cv", "es")).toBe(
      "https://example.com/es/cv",
    );
  });
});
