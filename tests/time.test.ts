import { describe, expect, it } from "vitest";
import { formatLocalTime, localToUtc, zoneOffsetMinutes, localDate } from "../src/domain/time";

describe("America/Vancouver time handling", () => {
  it("knows PDT and PST offsets", () => {
    expect(zoneOffsetMinutes(Date.parse("2026-07-01T12:00:00Z"), "America/Vancouver")).toBe(-420);
    expect(zoneOffsetMinutes(Date.parse("2026-12-01T12:00:00Z"), "America/Vancouver")).toBe(-480);
  });

  it("converts an ordinary local time", () => {
    expect(localToUtc("2026-10-10T19:30")).toEqual({ kind: "exact", utc: "2026-10-11T02:30:00.000Z" });
  });

  it("flags the repeated hour on fall-back night", () => {
    expect(localToUtc("2026-11-01T01:30")).toEqual({
      kind: "ambiguous",
      utc: "2026-11-01T08:30:00.000Z",
      alternativeUtc: "2026-11-01T09:30:00.000Z",
    });
  });

  it("flags the skipped hour on spring-forward night", () => {
    const r = localToUtc("2027-03-14T02:30");
    expect(r.kind).toBe("nonexistent");
    expect(r.utc).toBe("2027-03-14T10:30:00.000Z"); // = 03:30 PDT
  });

  it("formats with the zone label so DST is visible", () => {
    expect(formatLocalTime("2026-11-01T08:30:00Z")).toBe("1:30 AM PDT");
    expect(formatLocalTime("2026-11-01T09:30:00Z")).toBe("1:30 AM PST");
    expect(formatLocalTime("2026-10-11T06:45:00Z")).toBe("11:45 PM PDT");
  });

  it("computes the local date across UTC midnight", () => {
    expect(localDate("2026-10-11T06:30:00Z")).toBe("2026-10-10");
  });

  it("rejects malformed input", () => {
    expect(() => localToUtc("10/10/2026 7pm")).toThrow();
  });
});
