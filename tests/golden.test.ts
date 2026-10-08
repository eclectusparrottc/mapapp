import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_CONFIG, recommend, type Recommendation } from "../src/engine/feasibility";
import { addMinutes } from "../src/domain/time";
import type { RecommendationQuery } from "../src/domain/types";
import { expandCandidate, type CandidateShorthand } from "./helpers";

interface RecExpect {
  fit?: string;
  confidence?: string;
  bookingState?: string;
  unknownsInclude?: string[];
  unknownsExclude?: string[];
}
interface GoldenCase {
  name: string;
  query: RecommendationQuery;
  candidates: CandidateShorthand[];
  loader?: "timeout";
  expect: {
    status: string;
    windowMinutes?: number;
    topIds?: string[];
    includes?: string[];
    rejected?: Record<string, string[]>;
    recs?: Record<string, RecExpect>;
    whyIncludes?: Record<string, string>;
    notesInclude?: string[];
    suggestionsInclude?: string[];
  };
}

const dir = join(__dirname, "fixtures", "golden_cases");
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

describe("golden cases (directive P1.4)", () => {
  it("has at least 12 golden cases", () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  for (const file of files) {
    const gc = JSON.parse(readFileSync(join(dir, file), "utf8")) as GoldenCase;
    it(`${file}: ${gc.name}`, async () => {
      const candidates = gc.candidates.map(expandCandidate);
      const loader =
        gc.loader === "timeout" ? () => new Promise<never>(() => {}) : async () => candidates;
      const res = await recommend(gc.query, loader, { timeoutMs: 50 });
      const all: Recommendation[] = [...res.top, ...res.more];
      const byId = new Map(all.map((r) => [r.occurrenceId, r]));
      const e = gc.expect;

      expect(res.status, JSON.stringify(res.rejected)).toBe(e.status);
      if (e.windowMinutes !== undefined) expect(res.window?.minutes).toBe(e.windowMinutes);
      if (e.topIds) expect(all.map((r) => r.occurrenceId)).toEqual(e.topIds);
      for (const id of e.includes ?? []) expect(byId.has(id), `${id} should be recommended`).toBe(true);
      for (const [id, reasons] of Object.entries(e.rejected ?? {})) {
        const rej = res.rejected.find((r) => r.occurrenceId === id);
        expect(rej?.reasons, `${id} rejection`).toEqual(reasons);
        expect(byId.has(id)).toBe(false);
      }
      for (const [id, x] of Object.entries(e.recs ?? {})) {
        const r = byId.get(id);
        expect(r, `${id} missing`).toBeDefined();
        if (x.fit) expect(r!.fit).toBe(x.fit);
        if (x.confidence) expect(r!.confidenceLevel).toBe(x.confidence);
        if (x.bookingState) expect(r!.effectiveBookingState).toBe(x.bookingState);
        for (const u of x.unknownsInclude ?? []) expect(r!.unknowns).toContain(u);
        for (const u of x.unknownsExclude ?? []) expect(r!.unknowns).not.toContain(u);
      }
      for (const [id, s] of Object.entries(e.whyIncludes ?? {})) expect(byId.get(id)?.whyThisFits).toContain(s);
      for (const s of e.notesInclude ?? []) expect(res.notes.join(" ")).toContain(s);
      for (const s of e.suggestionsInclude ?? []) expect(res.suggestions).toContain(s);

      // Invariants that must hold for every recommendation in every case.
      for (const r of all) {
        const safety = ENGINE_CONFIG.safetyMarginMinutes[gc.query.mode];
        const mustBeGoneBy = addMinutes(r.recommendedLeaveBy, (r.toNextMinutesEstimate ?? 0) + safety);
        expect(Date.parse(mustBeGoneBy)).toBeLessThanOrEqual(Date.parse(res.window!.hardDeadline));
        expect(r.unknowns).toContain("travel_time_is_estimate");
        if (r.effectiveBookingState !== "verified_available") {
          expect(r.confidenceLevel).not.toBe("confirmed_from_authorized_source");
        }
        if (r.candidate.source.permission !== "authorized") {
          expect(r.confidenceLevel).not.toBe("confirmed_from_authorized_source");
        }
      }
      expect(res.top.length).toBeLessThanOrEqual(3);
    });
  }
});
