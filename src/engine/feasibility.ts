import { haversineMeters, isInServiceArea, walkMinutesEstimate, WALK } from "../domain/geo";
import { addMinutes, formatLocalTime, minutesBetween } from "../domain/time";
import {
  RecommendationQuery,
  type BookingState,
  type Candidate,
  type Category,
  type ConfidenceLevel,
  type ParsedQuery,
  type RejectionReason,
  type Unknown,
} from "../domain/types";

/**
 * Feasibility-Lite (directive P1.4, ADR-006). Deterministic, explainable, no ML.
 *
 *   hard_deadline        = next_commitment_start - arrival_buffer   (or now + free_minutes)
 *   earliest_start       = max(now + outbound_estimate, activity_start)
 *   projected_finish     = earliest_start + min_usable_duration
 *   require projected_finish + travel_to_next + safety_margin <= hard_deadline
 *   and projected_finish <= activity end / closing time (when known)
 *
 * Unknown queueing / booking is never assumed to be zero, and an unknown end time is never
 * turned into a fixed duration: when we must assume a minimum stay to check timing, the result
 * is downgraded to `fits_partially` + `estimated_only` and the assumption is listed in `unknowns`.
 */

export const ENGINE_CONFIG = {
  minWindowMinutes: 20,
  safetyMarginMinutes: { before_next_plan: 10, free_time: 5 },
  /** How late you may arrive to something with a fixed start and still count it. */
  lateArrivalGraceMinutes: { scheduled_event: 10, bookable_slot: 0, drop_in: 0 },
  /** Only used to test timing when the real minimum duration is unknown; always flagged. */
  assumedMinStayMinutes: 30,
  weights: { completeness: 0.35, proximity: 0.35, interest: 0.2, slack: 0.1 },
} as const;

export type EngineConfig = typeof ENGINE_CONFIG;

export type Fit = "fits" | "fits_partially";

export interface Recommendation {
  occurrenceId: string;
  candidate: Candidate;
  fit: Fit;
  confidenceLevel: ConfidenceLevel;
  effectiveBookingState: BookingState;
  whyThisFits: string;
  /** Latest time to leave the start point (UTC ISO). */
  departBy: string;
  /** Time to leave the activity to make the next commitment / end of free time (UTC ISO). */
  recommendedLeaveBy: string;
  earliestStart: string;
  outboundMinutesEstimate: number;
  toNextMinutesEstimate: number | null;
  distanceFromStartMeters: number;
  distanceToNextMeters: number | null;
  minutesAtActivity: number;
  spareMinutes: number;
  unknowns: Unknown[];
  score: number;
}

export interface Rejection {
  occurrenceId: string;
  title: string;
  reasons: RejectionReason[];
}

export type ResultStatus = "ok" | "no_candidates" | "window_too_short" | "invalid_query" | "source_unavailable";

export interface RecommendationResult {
  status: ResultStatus;
  window: { start: string; hardDeadline: string; minutes: number } | null;
  top: Recommendation[];
  more: Recommendation[];
  rejected: Rejection[];
  /** Plain-language notes for the UI (why empty, what to try). */
  notes: string[];
  suggestions: Array<"extend_time" | "widen_area" | "change_interests" | "try_later" | "use_list_fallback">;
  errors?: string[];
}

const PUBLIC_PERMISSIONS = new Set(["authorized", "synthetic"]);

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\[demo\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Same title at the same venue starting at the same instant = same occurrence, whatever the source. */
export function dedupeKey(c: Candidate): string {
  return `${normalizeTitle(c.title)}|${c.venue.id}|${c.startsAt ?? "open"}`;
}

const PERMISSION_RANK: Record<string, number> = { authorized: 0, synthetic: 1, unverified: 2, denied: 3 };

export function dedupe(candidates: Candidate[]): { kept: Candidate[]; duplicates: Candidate[] } {
  const best = new Map<string, Candidate>();
  const duplicates: Candidate[] = [];
  for (const c of candidates) {
    const key = dedupeKey(c);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, c);
      continue;
    }
    const better =
      PERMISSION_RANK[c.source.permission]! < PERMISSION_RANK[prev.source.permission]! ||
      (c.source.permission === prev.source.permission &&
        (c.source.lastSourceUpdate ?? "") > (prev.source.lastSourceUpdate ?? ""));
    if (better) {
      duplicates.push(prev);
      best.set(key, c);
    } else {
      duplicates.push(c);
    }
  }
  const keptIds = new Set([...best.values()].map((c) => c.occurrenceId));
  return { kept: candidates.filter((c) => keptIds.has(c.occurrenceId)), duplicates };
}

export function effectiveBookingState(c: Candidate, now: string): { state: BookingState; expired: boolean } {
  const { state, expiresAt } = c.availability;
  if (expiresAt && Date.parse(expiresAt) <= Date.parse(now) && state !== "unknown") {
    // A stale "full" or "available" is no longer evidence either way.
    return { state: "unknown", expired: true };
  }
  return { state, expired: false };
}

type Evaluation = { ok: true; rec: Omit<Recommendation, "score"> } | { ok: false; reasons: RejectionReason[] };

function evaluate(c: Candidate, q: ParsedQuery, hardDeadline: string, cfg: EngineConfig): Evaluation {
  const reasons: RejectionReason[] = [];
  const now = q.now;

  if (!PUBLIC_PERMISSIONS.has(c.source.permission)) reasons.push("permission_not_public");
  if (c.cancellationStatus === "cancelled") reasons.push("cancelled");
  if (c.cancellationStatus === "postponed") reasons.push("postponed");

  const booking = effectiveBookingState(c, now);
  if (booking.state === "full") reasons.push("full");
  if (booking.state === "unavailable") reasons.push("unavailable");

  const venue = c.venue;
  if (venue.lat === null || venue.lng === null) reasons.push("missing_coordinates");
  else if (!isInServiceArea(venue)) reasons.push("invalid_coordinates");

  const fixedStart = c.kind !== "drop_in";
  if (fixedStart && !c.startsAt) reasons.push("missing_time");
  if (c.endsAt && c.endTimeQuality !== "unknown" && Date.parse(c.endsAt) <= Date.parse(now)) {
    reasons.push("already_ended");
  }
  if (reasons.length) return { ok: false, reasons };

  const venuePoint = { lat: venue.lat!, lng: venue.lng! };
  const windowMinutes = minutesBetween(now, hardDeadline);
  const distanceFromStart = haversineMeters(q.origin, venuePoint);
  // Coarse filter: unreachable even with zero time spent there.
  if ((distanceFromStart * WALK.detourFactor) / WALK.speedMetersPerMinute > windowMinutes) {
    return { ok: false, reasons: ["too_far"] };
  }

  const next = q.nextCommitment;
  const outbound = walkMinutesEstimate(q.origin, venuePoint);
  const toNext = next ? walkMinutesEstimate(venuePoint, next.location) : null;
  const distanceToNext = next ? haversineMeters(venuePoint, next.location) : null;
  const safety = cfg.safetyMarginMinutes[q.mode];
  const arrival = addMinutes(now, outbound);
  const latestLeave = addMinutes(hardDeadline, -((toNext ?? 0) + safety));

  const unknowns = new Set<Unknown>(["travel_time_is_estimate"]);
  if (q.origin.isSample) unknowns.add("start_location_is_sample");
  if (c.source.isDemo || c.source.permission === "synthetic") unknowns.add("synthetic_demo_data");
  if (booking.expired) unknowns.add("availability_snapshot_expired");

  // When can the activity actually start for this user?
  let earliestStart = arrival;
  if (fixedStart) {
    const start = c.startsAt!;
    const grace = cfg.lateArrivalGraceMinutes[c.kind];
    if (Date.parse(arrival) > Date.parse(addMinutes(start, grace))) return { ok: false, reasons: ["already_started"] };
    if (Date.parse(start) >= Date.parse(latestLeave)) return { ok: false, reasons: ["starts_after_window"] };
    if (Date.parse(start) > Date.parse(arrival)) earliestStart = start;
  } else if (c.startsAt && Date.parse(c.startsAt) > Date.parse(arrival)) {
    earliestStart = c.startsAt; // drop-in not open yet when you arrive
  }

  // Minimum meaningful stay.
  const endKnown = c.endsAt !== null && c.endTimeQuality !== "unknown";
  let minUsable: number | null = c.durationMinMinutes;
  if (minUsable === null && fixedStart && endKnown) minUsable = minutesBetween(earliestStart, c.endsAt!);
  let assumedStay = false;
  if (minUsable === null) {
    minUsable = cfg.assumedMinStayMinutes;
    assumedStay = true;
    unknowns.add("duration_unknown");
  }

  const projectedFinish = addMinutes(earliestStart, minUsable);
  if (endKnown && Date.parse(projectedFinish) > Date.parse(c.endsAt!)) {
    return { ok: false, reasons: [fixedStart ? "not_enough_time" : "closes_too_soon"] };
  }
  if (Date.parse(projectedFinish) > Date.parse(latestLeave)) return { ok: false, reasons: ["not_enough_time"] };

  // Honest labelling of everything we do not know.
  if (c.endTimeQuality === "unknown" || c.endsAt === null) unknowns.add(fixedStart ? "end_time_unknown" : "closing_time_unknown");
  if (c.endTimeQuality === "estimated") unknowns.add("end_time_estimated");
  const capacityVerified = booking.state === "verified_available" && c.source.permission === "authorized";
  if (!capacityVerified && c.kind !== "drop_in") unknowns.add("capacity_not_verified");
  if (c.kind === "drop_in" && booking.state !== "verified_available" && c.requiresBooking) unknowns.add("capacity_not_verified");
  if (c.requiresBooking === true && !capacityVerified) unknowns.add("booking_required");
  if (c.requiresBooking === null) unknowns.add("booking_may_be_required");

  const leaveBy =
    endKnown && Date.parse(c.endsAt!) < Date.parse(latestLeave) ? c.endsAt! : latestLeave;
  const minutesAtActivity = Math.floor(minutesBetween(earliestStart, leaveBy));
  const spare = Math.floor(minutesBetween(projectedFinish, latestLeave));
  const departBy = fixedStart
    ? addMinutes(c.startsAt!, -outbound)
    : addMinutes(latestLeave, -(minUsable + outbound));

  let confidence: ConfidenceLevel;
  if (capacityVerified && endKnown && c.endTimeQuality === "known" && !assumedStay) {
    confidence = "confirmed_from_authorized_source";
  } else if (!assumedStay && (fixedStart ? c.startsAt !== null : c.startsAt !== null && endKnown)) {
    confidence = "schedule_known_capacity_unknown";
  } else {
    confidence = "estimated_only";
  }

  const fit: Fit = assumedStay || (fixedStart && !endKnown) ? "fits_partially" : "fits";

  const parts = [`~${outbound} min walk (est.)`];
  if (fixedStart) parts.push(`starts ${formatLocalTime(c.startsAt!)}`);
  parts.push(assumedStay ? `about ${minutesAtActivity} min available there (length unknown)` : `${minutesAtActivity} min there`);
  if (next && toNext !== null) {
    parts.push(`leave by ${formatLocalTime(leaveBy)} to reach ${next.name} ~${toNext} min away`);
  } else {
    parts.push(`wrap up by ${formatLocalTime(leaveBy)}`);
  }
  if (spare > 0) parts.push(`${spare} min spare`);

  return {
    ok: true,
    rec: {
      occurrenceId: c.occurrenceId,
      candidate: c,
      fit,
      confidenceLevel: confidence,
      effectiveBookingState: booking.state,
      whyThisFits: parts.join(" · "),
      departBy,
      recommendedLeaveBy: leaveBy,
      earliestStart,
      outboundMinutesEstimate: outbound,
      toNextMinutesEstimate: toNext,
      distanceFromStartMeters: Math.round(distanceFromStart),
      distanceToNextMeters: distanceToNext === null ? null : Math.round(distanceToNext),
      minutesAtActivity,
      spareMinutes: spare,
      unknowns: [...unknowns].sort(),
    },
  };
}

/** Share of decision-relevant fields that are actually known (0..1). */
export function completeness(c: Candidate): number {
  const checks = [
    c.startsAt !== null,
    c.endsAt !== null && c.endTimeQuality === "known",
    c.durationMinMinutes !== null,
    c.availability.state !== "unknown",
    c.source.url !== null,
    c.requiresBooking !== null,
  ];
  return checks.filter(Boolean).length / checks.length;
}

export function scoreRecommendation(
  r: Omit<Recommendation, "score">,
  windowMinutes: number,
  interests: Category[],
  cfg: EngineConfig = ENGINE_CONFIG,
): number {
  const w = cfg.weights;
  const travel = r.outboundMinutesEstimate + (r.toNextMinutesEstimate ?? 0);
  const proximity = 1 - Math.min(1, travel / windowMinutes);
  const interest = interests.length === 0 ? 0.5 : r.candidate.categories.some((c) => interests.includes(c)) ? 1 : 0;
  const slack = Math.min(1, Math.max(0, r.spareMinutes) / windowMinutes);
  const s = w.completeness * completeness(r.candidate) + w.proximity * proximity + w.interest * interest + w.slack * slack;
  return Math.round(s * 1000) / 1000;
}

const FIT_TIER: Record<Fit, number> = { fits: 0, fits_partially: 1 };

/** Pure, synchronous core. */
export function recommendFromCandidates(
  rawQuery: RecommendationQuery,
  candidates: Candidate[],
  cfg: EngineConfig = ENGINE_CONFIG,
): RecommendationResult {
  const parsed = RecommendationQuery.safeParse(rawQuery);
  if (!parsed.success) {
    return {
      status: "invalid_query",
      window: null,
      top: [],
      more: [],
      rejected: [],
      notes: ["Some inputs are missing or invalid."],
      suggestions: [],
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`),
    };
  }
  const q = parsed.data;

  const hardDeadline =
    q.mode === "before_next_plan"
      ? addMinutes(q.nextCommitment!.startsAt, -q.nextCommitment!.arrivalBufferMinutes)
      : addMinutes(q.now, q.freeMinutes!);
  const windowMinutes = minutesBetween(q.now, hardDeadline);
  const window = { start: q.now, hardDeadline, minutes: Math.floor(windowMinutes) };

  if (windowMinutes < cfg.minWindowMinutes) {
    return {
      status: "window_too_short",
      window,
      top: [],
      more: [],
      rejected: [],
      notes: [
        windowMinutes <= 0
          ? "You should already be heading to your next plan."
          : `Only ${Math.max(0, Math.floor(windowMinutes))} min before you need to leave for your next plan — not enough to fit anything in safely.`,
      ],
      suggestions: q.mode === "before_next_plan" ? ["try_later"] : ["extend_time"],
    };
  }

  const { kept, duplicates } = dedupe(candidates);
  const rejected: Rejection[] = duplicates.map((c) => ({
    occurrenceId: c.occurrenceId,
    title: c.title,
    reasons: ["duplicate"],
  }));

  const recs: Recommendation[] = [];
  for (const c of kept) {
    const e = evaluate(c, q, hardDeadline, cfg);
    if (!e.ok) {
      rejected.push({ occurrenceId: c.occurrenceId, title: c.title, reasons: e.reasons });
      continue;
    }
    recs.push({ ...e.rec, score: scoreRecommendation(e.rec, windowMinutes, q.interests, cfg) });
  }

  recs.sort(
    (a, b) =>
      FIT_TIER[a.fit] - FIT_TIER[b.fit] || b.score - a.score || a.occurrenceId.localeCompare(b.occurrenceId),
  );
  rejected.sort((a, b) => a.occurrenceId.localeCompare(b.occurrenceId));

  if (recs.length === 0) {
    return {
      status: "no_candidates",
      window,
      top: [],
      more: [],
      rejected,
      notes: ["Nothing we know about fits this time window from here. We'd rather show nothing than a guess."],
      suggestions: q.mode === "free_time" ? ["extend_time", "widen_area", "change_interests"] : ["widen_area", "change_interests"],
    };
  }

  const notes: string[] = [];
  if (q.origin.isSample) notes.push(`Start point is a sample location (${q.origin.label}), not your actual position.`);
  if (recs.some((r) => r.unknowns.includes("synthetic_demo_data"))) notes.push("DEMO DATA: these activities are synthetic.");

  return {
    status: "ok",
    window,
    top: recs.slice(0, q.topN),
    more: recs.slice(q.topN),
    rejected,
    notes,
    suggestions: [],
  };
}

export type CandidateLoader = (signal: AbortSignal) => Promise<Candidate[]>;

/** Async wrapper: a slow or failing source degrades to an explicit status, never a fake success. */
export async function recommend(
  query: RecommendationQuery,
  load: CandidateLoader,
  opts: { timeoutMs?: number; config?: EngineConfig } = {},
): Promise<RecommendationResult> {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 8000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const candidates = await Promise.race([
      load(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`source timed out after ${timeoutMs} ms`));
        }, timeoutMs);
      }),
    ]);
    return recommendFromCandidates(query, candidates, opts.config);
  } catch (err) {
    return {
      status: "source_unavailable",
      window: null,
      top: [],
      more: [],
      rejected: [],
      notes: ["We couldn't reach the activity data source. Nothing is shown rather than stale or guessed results."],
      suggestions: ["try_later", "use_list_fallback"],
      errors: [err instanceof Error ? err.message : String(err)],
    };
  } finally {
    clearTimeout(timer);
  }
}
