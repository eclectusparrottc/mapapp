import { DEMO_VENUES } from "../src/demo/demoData";
import type { Candidate } from "../src/domain/types";

/** Compact fixture shorthand -> full Candidate. Defaults are deliberately "unknown"/"synthetic". */
export interface CandidateShorthand {
  id: string;
  title?: string;
  kind?: Candidate["kind"];
  categories?: Candidate["categories"];
  venue: keyof typeof DEMO_VENUES | { lat: number | null; lng: number | null };
  startsAt?: string | null;
  endsAt?: string | null;
  endQuality?: Candidate["endTimeQuality"];
  durMin?: number | null;
  cancellation?: Candidate["cancellationStatus"];
  booking?: Candidate["availability"]["state"];
  verifiedAt?: string | null;
  expiresAt?: string | null;
  requiresBooking?: boolean | null;
  permission?: Candidate["source"]["permission"];
  url?: string | null;
  lastSourceUpdate?: string | null;
  sourceName?: string;
}

export function expandCandidate(s: CandidateShorthand): Candidate {
  const venue =
    typeof s.venue === "string"
      ? { ...DEMO_VENUES[s.venue]!, timezone: "America/Vancouver" }
      : { id: `venue-${s.id}`, name: `Venue ${s.id}`, address: null, timezone: "America/Vancouver", ...s.venue };
  const endsAt = s.endsAt ?? null;
  const permission = s.permission ?? "synthetic";
  return {
    occurrenceId: s.id,
    activityId: s.id,
    title: s.title ?? s.id,
    kind: s.kind ?? "drop_in",
    categories: s.categories ?? ["arts"],
    shortSummary: "",
    durationMinMinutes: s.durMin === undefined ? 30 : s.durMin,
    durationMaxMinutes: null,
    venue,
    startsAt: s.startsAt ?? null,
    endsAt,
    originalTimezone: "America/Vancouver",
    endTimeQuality: s.endQuality ?? (endsAt ? "known" : "unknown"),
    cancellationStatus: s.cancellation ?? "scheduled",
    requiresBooking: s.requiresBooking === undefined ? false : s.requiresBooking,
    availability: {
      state: s.booking ?? "unknown",
      verifiedAt: s.verifiedAt ?? null,
      expiresAt: s.expiresAt ?? null,
      verificationSource: null,
    },
    source: {
      name: s.sourceName ?? "fixture",
      externalId: s.id,
      url: s.url ?? null,
      permission,
      lastSourceUpdate: s.lastSourceUpdate ?? null,
      isDemo: permission === "synthetic",
    },
  };
}
