import { describe, expect, it } from "vitest";
import { buildDemoCandidates, DEMO_TEMPLATES, SAMPLE_PLACES } from "../src/demo/demoData";
import { Candidate } from "../src/domain/types";
import { recommendFromCandidates } from "../src/engine/feasibility";

describe("synthetic demo dataset", () => {
  it("has 30-50 activities with the required mix", () => {
    const n = DEMO_TEMPLATES.length;
    expect(n).toBeGreaterThanOrEqual(30);
    expect(n).toBeLessThanOrEqual(50);
    const count = (k: string) => DEMO_TEMPLATES.filter((t) => t.kind === k).length;
    expect(count("scheduled_event")).toBeGreaterThanOrEqual(10);
    expect(count("drop_in")).toBeGreaterThanOrEqual(10);
    expect(count("bookable_slot")).toBeGreaterThanOrEqual(5);
    const unknownInventorySlots = DEMO_TEMPLATES.filter(
      (t) => t.kind === "bookable_slot" && t.booking !== "verified_available",
    );
    expect(unknownInventorySlots.length).toBeGreaterThanOrEqual(5);
    const edges = new Set(DEMO_TEMPLATES.map((t) => t.edge).filter(Boolean));
    for (const e of ["cancelled", "duplicate", "unknown_end", "cross_midnight", "sold_out", "missing_coordinates", "invalid_coordinates"]) {
      expect(edges).toContain(e);
    }
  });

  it("every activity is visibly labeled DEMO and marked synthetic", () => {
    for (const t of DEMO_TEMPLATES) expect(t.title.startsWith("[DEMO]")).toBe(true);
    for (const c of buildDemoCandidates("2026-10-10T19:00:00Z")) {
      expect(c.source.permission).toBe("synthetic");
      expect(c.source.isDemo).toBe(true);
      expect(Candidate.safeParse(c).success).toBe(true);
    }
  });

  it("covers both Phase 1 areas", () => {
    const ids = DEMO_TEMPLATES.map((t) => t.id);
    expect(ids.filter((i) => i.startsWith("dt-")).length).toBeGreaterThanOrEqual(15);
    expect(ids.filter((i) => i.startsWith("rm-")).length).toBeGreaterThanOrEqual(5);
  });

  it("materializes for any date with unique occurrence ids (incl. weekday/weekend)", () => {
    for (const now of ["2026-10-10T19:00:00Z", "2026-10-13T19:00:00Z", "2026-11-01T09:00:00Z"]) {
      const cs = buildDemoCandidates(now);
      expect(new Set(cs.map((c) => c.occurrenceId)).size).toBe(cs.length);
    }
  });

  it("produces real recommendations for the headline scenario (Sat 17:45, game at 19:30)", () => {
    const res = recommendFromCandidates(
      {
        mode: "before_next_plan",
        now: "2026-10-11T00:45:00Z",
        origin: { ...SAMPLE_PLACES.downtown_sample_start, isSample: true },
        nextCommitment: {
          name: "Rogers Arena",
          location: SAMPLE_PLACES.rogers_arena,
          startsAt: "2026-10-11T02:30:00Z",
          arrivalBufferMinutes: 15,
        },
      },
      buildDemoCandidates("2026-10-11T00:45:00Z"),
    );
    expect(res.status).toBe("ok");
    expect(res.top).toHaveLength(3);
    const rejectedReasons = new Set(res.rejected.flatMap((r) => r.reasons));
    expect(rejectedReasons).toContain("duplicate");
    expect(rejectedReasons).toContain("cancelled");
    expect(rejectedReasons).toContain("too_far"); // Richmond
    for (const r of [...res.top, ...res.more]) {
      expect(r.confidenceLevel).not.toBe("confirmed_from_authorized_source");
      expect(r.unknowns).toContain("synthetic_demo_data");
    }
  });
});
