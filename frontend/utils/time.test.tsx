import { formatRelativeTime, toLocaleString, getJsonOrRawData } from "./time";

describe("formatRelativeTime", () => {
  it("returns seconds ago when elapsed < 60s", () => {
    const date = new Date(Date.now() - 30_000);
    expect(formatRelativeTime(date)).toBe("Last updated 30s ago");
  });

  it("returns minutes ago when elapsed is between 60s and 3600s", () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(date)).toBe("Last updated 5m ago");
  });

  it("returns hours ago when elapsed >= 3600s", () => {
    const date = new Date(Date.now() - 2 * 3600_000);
    expect(formatRelativeTime(date)).toBe("Last updated 2h ago");
  });

  it("returns '0s ago' for a date equal to now", () => {
    const date = new Date(Date.now());
    expect(formatRelativeTime(date)).toMatch(/Last updated \ds ago/);
  });
});

describe("toLocaleString", () => {
  it("converts an epoch ms string to a locale date string", () => {
    const epoch = "0";
    const result = toLocaleString(epoch);
    // Just verify it returns a non-empty string (locale varies by environment)
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getJsonOrRawData", () => {
  it("parses valid JSON and returns the object", () => {
    const result = getJsonOrRawData('{"key":"value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("returns the raw string when input is not valid JSON", () => {
    const raw = "not valid json {{";
    expect(getJsonOrRawData(raw)).toBe(raw);
  });

  it("returns raw string for an empty string input", () => {
    expect(getJsonOrRawData("")).toBe("");
  });

  it("returns raw string for a plain string that is not JSON", () => {
    expect(getJsonOrRawData("hello world")).toBe("hello world");
  });
});
