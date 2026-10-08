import { describe, expect, it } from "vitest";
import {
  formatLocalTime,
  localDate,
  localToUtc,
  runtimeKnowsBcPermanentTime,
  zoneOffsetMinutes,
} from "../src/domain/time";

// DST tests use *historical* transitions, which are identical in every tzdata release.
// BC has been on permanent UTC-7 since the 2026-03-08 spring-forward (no 2026-11-01 fall-back).

describe("America/Vancouver time handling", () => {
  it("knows historical PDT and PST offsets", () => {
    expect(zoneOffsetMinutes(Date.parse("2025-07-01T12:00:00Z"), "America/Vancouver")).toBe(-420);
    expect(zoneOffsetMinutes(Date.parse("2025-12-01T12:00:00Z"), "America/Vancouver")).toBe(-480);
  });

  it("converts an ordinary local time", () => {
    expect(localToUtc("2026-10-10T19:30")).toEqual({ kind: "exact", utc: "2026-10-11T02:30:00.000Z" });
  });

  it("flags the repeated hour on the 2025 fall-back night", () => {
    expect(localToUtc("2025-11-02T01:30")).toEqual({
      kind: "ambiguous",
      utc: "2025-11-02T08:30:00.000Z",
      alternativeUtc: "2025-11-02T09:30:00.000Z",
    });
  });

  it("flags the skipped hour on the 2026 spring-forward night (BC's last clock change)", () => {
    const r = localToUtc("2026-03-08T02:30");
    expect(r.kind).toBe("nonexistent");
    expect(r.utc).toBe("2026-03-08T10:30:00.000Z"); // = 03:30 PDT
  });

  it("formats with the zone label so DST is visible", () => {
    expect(formatLocalTime("2025-11-02T08:30:00Z")).toBe("1:30 AM PDT");
    expect(formatLocalTime("2025-11-02T09:30:00Z")).toBe("1:30 AM PST");
    expect(formatLocalTime("2026-10-11T06:45:00Z")).toBe("11:45 PM PDT");
  });

  describe("BC permanent UTC-7 (from 2026-11-01 onwards there is no fall-back)", () => {
    it("keeps UTC-7 in winter 2026/27 regardless of runtime tzdata", () => {
      expect(zoneOffsetMinutes(Date.parse("2026-12-15T20:00:00Z"), "America/Vancouver")).toBe(-420);
      expect(zoneOffsetMinutes(Date.parse("2027-07-01T20:00:00Z"), "America/Vancouver")).toBe(-420);
      expect(formatLocalTime("2026-11-01T09:30:00Z")).toMatch(/^2:30 AM (PDT|MST|GMT-7)$/);
      expect(formatLocalTime("2026-12-15T20:00:00Z")).toMatch(/^1:00 PM (PDT|MST|GMT-7)$/);
    });

    it("2026-11-01 01:30 is no longer ambiguous and 2027-03-14 02:30 exists", () => {
      expect(localToUtc("2026-11-01T01:30")).toEqual({ kind: "exact", utc: "2026-11-01T08:30:00.000Z" });
      expect(localToUtc("2027-03-14T02:30")).toEqual({ kind: "exact", utc: "2027-03-14T09:30:00.000Z" });
    });

    it("reports whether the runtime tzdata itself knows the change (diagnostic)", () => {
      console.info(`runtime tzdata ${process.versions.tz ?? "?"} knows BC permanent UTC-7: ${runtimeKnowsBcPermanentTime()}`);
      expect(typeof runtimeKnowsBcPermanentTime()).toBe("boolean");
    });
  });

  it("computes the local date across UTC midnight", () => {
    expect(localDate("2026-10-11T06:30:00Z")).toBe("2026-10-10");
  });

  it("rejects malformed input", () => {
    expect(() => localToUtc("10/10/2026 7pm")).toThrow();
  });
});
