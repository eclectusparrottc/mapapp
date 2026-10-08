import { describe, expect, it } from "vitest";
import { completeness, dedupe, ENGINE_CONFIG, scoreRecommendation, type Recommendation } from "../src/engine/feasibility";
import { expandCandidate } from "./helpers";

const base = (over: Partial<Omit<Recommendation, "score">> = {}): Omit<Recommendation, "score"> => ({
  occurrenceId: "x",
  candidate: expandCandidate({ id: "x", venue: "dt_plaza", startsAt: "2026-10-11T01:00:00Z", endsAt: "2026-10-11T02:00:00Z", url: "https://example.org", booking: "sales_open_not_inventory" }),
  fit: "fits",
  confidenceLevel: "schedule_known_capacity_unknown",
  effectiveBookingState: "sales_open_not_inventory",
  whyThisFits: "",
  departBy: "2026-10-11T00:50:00Z",
  recommendedLeaveBy: "2026-10-11T02:00:00Z",
  earliestStart: "2026-10-11T01:00:00Z",
  outboundMinutesEstimate: 10,
  toNextMinutesEstimate: 10,
  distanceFromStartMeters: 500,
  distanceToNextMeters: 500,
  minutesAtActivity: 60,
  spareMinutes: 30,
  unknowns: [],
  ...over,
});

describe("ranking weights (ADR-006)", () => {
  it("weights sum to 1 so scores stay in 0..1", () => {
    const w = ENGINE_CONFIG.weights;
    expect(w.completeness + w.proximity + w.interest + w.slack).toBeCloseTo(1, 10);
  });

  it("completeness counts known decision fields", () => {
    expect(completeness(expandCandidate({ id: "a", venue: "dt_plaza" }))).toBeCloseTo(2 / 6); // fixture default duration + requiresBooking=false known
    expect(
      completeness(
        expandCandidate({ id: "b", venue: "dt_plaza", startsAt: "2026-10-11T01:00:00Z", endsAt: "2026-10-11T02:00:00Z", url: "https://example.org", booking: "full" }),
      ),
    ).toBe(1);
  });

  it("closer beats farther, all else equal", () => {
    const near = scoreRecommendation(base({ outboundMinutesEstimate: 5, toNextMinutesEstimate: 5 }), 90, []);
    const far = scoreRecommendation(base({ outboundMinutesEstimate: 25, toNextMinutesEstimate: 25 }), 90, []);
    expect(near).toBeGreaterThan(far);
  });

  it("interest match beats no match; no interests is neutral", () => {
    const match = scoreRecommendation(base(), 90, ["arts"]);
    const miss = scoreRecommendation(base(), 90, ["sports"]);
    const neutral = scoreRecommendation(base(), 90, []);
    expect(match).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(miss);
  });

  it("more slack ranks higher, all else equal", () => {
    expect(scoreRecommendation(base({ spareMinutes: 40 }), 90, [])).toBeGreaterThan(
      scoreRecommendation(base({ spareMinutes: 2 }), 90, []),
    );
  });

  it("is deterministic and bounded", () => {
    const s = scoreRecommendation(base(), 90, ["arts"]);
    expect(s).toBe(scoreRecommendation(base(), 90, ["arts"]));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("cross-source dedupe", () => {
  it("merges the same event from two sources with different venue ids at the same place", () => {
    const a = expandCandidate({ id: "a", title: "Jazz Night", venue: { lat: 49.27451, lng: -123.12101 }, startsAt: "2026-10-11T03:00:00Z", permission: "synthetic" });
    const b = expandCandidate({ id: "b", title: "JAZZ NIGHT!", venue: { lat: 49.27449, lng: -123.12099 }, startsAt: "2026-10-11T03:00:00Z", permission: "authorized" });
    const { kept, duplicates } = dedupe([a, b]);
    expect(kept.map((c) => c.occurrenceId)).toEqual(["b"]); // authorized wins
    expect(duplicates.map((c) => c.occurrenceId)).toEqual(["a"]);
  });

  it("keeps different start times apart", () => {
    const a = expandCandidate({ id: "a", title: "Jazz", venue: "dt_yaletown", startsAt: "2026-10-11T03:00:00Z" });
    const b = expandCandidate({ id: "b", title: "Jazz", venue: "dt_yaletown", startsAt: "2026-10-11T04:00:00Z" });
    expect(dedupe([a, b]).kept).toHaveLength(2);
  });
});
