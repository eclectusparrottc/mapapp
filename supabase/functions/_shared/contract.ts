/**
 * Public read API contract v1 (directive P1.2). Dependency-free so it runs in Deno (Edge Function)
 * and Node (tests, UI typed client). Any change here is a contract change: bump the version.
 *
 *   GET /activities?bbox=minLng,minLat,maxLng,maxLat&from=ISO&to=ISO&kind=a,b&category=x,y&limit=N
 *   GET /activities/{occurrenceId}
 *   GET /healthz
 */

export const API_VERSION = "v1";

export const KINDS = ["scheduled_event", "drop_in", "bookable_slot"] as const;
export const CATEGORIES = [
  "arts", "music", "food_drink", "outdoors", "sports", "learning", "shopping", "family", "nightlife", "wellness",
] as const;

export const LIMITS = {
  maxBboxDegrees: 0.6, // ~ Metro Vancouver width; prevents "dump everything" queries
  maxRangeHours: 48,
  defaultLimit: 100,
  maxLimit: 200,
  maxQueryLength: 512,
} as const;

/** Service area: Metro Vancouver. Requests outside it are rejected rather than silently empty. */
export const SERVICE_AREA = { minLat: 49.0, maxLat: 49.45, minLng: -123.35, maxLng: -122.4 } as const;

export interface ActivitiesQuery {
  bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  from: string;
  to: string;
  kinds: Array<(typeof KINDS)[number]>;
  categories: Array<(typeof CATEGORIES)[number]>;
  limit: number;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const ALLOWED_PARAMS = new Set(["bbox", "from", "to", "kind", "category", "limit"]);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;
const OCCURRENCE_ID_RE = /^[A-Za-z0-9._:-]{1,250}$/;

function parseList<T extends string>(raw: string | null, allowed: readonly T[], name: string, errors: string[]): T[] {
  if (raw === null || raw === "") return [];
  const items = raw.split(",").map((s) => s.trim());
  const bad = items.filter((i) => !(allowed as readonly string[]).includes(i));
  if (bad.length) errors.push(`${name}: unknown value(s) ${bad.slice(0, 3).join(", ")}`);
  return [...new Set(items)] as T[];
}

export function parseActivitiesQuery(params: URLSearchParams, now: Date = new Date()): ParseResult<ActivitiesQuery> {
  const errors: string[] = [];
  if (params.toString().length > LIMITS.maxQueryLength) return { ok: false, errors: ["query string too long"] };
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) errors.push(`unknown parameter: ${key.slice(0, 40)}`);
  }
  for (const key of ALLOWED_PARAMS) {
    if (params.getAll(key).length > 1) errors.push(`${key}: must be given once`);
  }

  const bboxRaw = params.get("bbox");
  let bbox: ActivitiesQuery["bbox"] | null = null;
  if (!bboxRaw) errors.push("bbox: required (minLng,minLat,maxLng,maxLat)");
  else {
    const parts = bboxRaw.split(",").map((p) => (/^-?\d{1,3}(\.\d{1,8})?$/.test(p.trim()) ? Number(p) : NaN));
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) errors.push("bbox: expected 4 decimal numbers");
    else if (minLng! >= maxLng! || minLat! >= maxLat!) errors.push("bbox: min must be less than max");
    else if (maxLng! - minLng! > LIMITS.maxBboxDegrees || maxLat! - minLat! > LIMITS.maxBboxDegrees) {
      errors.push(`bbox: larger than ${LIMITS.maxBboxDegrees} degrees`);
    } else if (
      maxLat! < SERVICE_AREA.minLat || minLat! > SERVICE_AREA.maxLat ||
      maxLng! < SERVICE_AREA.minLng || minLng! > SERVICE_AREA.maxLng
    ) {
      errors.push("bbox: outside the Phase 1 service area (Metro Vancouver)");
    } else {
      bbox = { minLng: minLng!, minLat: minLat!, maxLng: maxLng!, maxLat: maxLat! };
    }
  }

  const fromRaw = params.get("from") ?? now.toISOString();
  const toRaw = params.get("to");
  let from: string | null = null;
  let to: string | null = null;
  if (!ISO_RE.test(fromRaw) || Number.isNaN(Date.parse(fromRaw))) errors.push("from: must be ISO-8601 with offset");
  else from = new Date(fromRaw).toISOString();
  if (!toRaw) errors.push("to: required ISO-8601 with offset");
  else if (!ISO_RE.test(toRaw) || Number.isNaN(Date.parse(toRaw))) errors.push("to: must be ISO-8601 with offset");
  else to = new Date(toRaw).toISOString();
  if (from && to) {
    const hours = (Date.parse(to) - Date.parse(from)) / 3_600_000;
    if (hours <= 0) errors.push("to: must be after from");
    else if (hours > LIMITS.maxRangeHours) errors.push(`to: range longer than ${LIMITS.maxRangeHours}h`);
  }

  const kinds = parseList(params.get("kind"), KINDS, "kind", errors);
  const categories = parseList(params.get("category"), CATEGORIES, "category", errors);

  let limit: number = LIMITS.defaultLimit;
  const limitRaw = params.get("limit");
  if (limitRaw !== null) {
    if (!/^\d{1,4}$/.test(limitRaw) || Number(limitRaw) < 1 || Number(limitRaw) > LIMITS.maxLimit) {
      errors.push(`limit: integer 1..${LIMITS.maxLimit}`);
    } else limit = Number(limitRaw);
  }

  if (errors.length || !bbox || !from || !to) return { ok: false, errors };
  return { ok: true, value: { bbox, from, to, kinds, categories, limit } };
}

export function isValidOccurrenceId(id: string): boolean {
  return OCCURRENCE_ID_RE.test(id);
}

/** Row shape of public.public_occurrences_v1. */
export interface PublicOccurrenceRow {
  occurrence_id: string;
  activity_id: string;
  title: string;
  kind: (typeof KINDS)[number];
  categories: string[];
  short_summary: string;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  requires_booking: boolean | null;
  source_url: string | null;
  venue_id: string;
  venue_name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  venue_timezone: string;
  starts_at_utc: string | null;
  ends_at_utc: string | null;
  original_timezone: string;
  end_time_quality: "known" | "estimated" | "unknown";
  cancellation_status: "scheduled" | "cancelled" | "postponed";
  booking_state: "verified_available" | "sales_open_not_inventory" | "unknown" | "full" | "unavailable";
  verified_at: string | null;
  expires_at: string | null;
  verification_source: string | null;
  source_name: string | null;
  data_permission_status: "authorized" | "synthetic" | null;
  last_source_update: string | null;
}

const iso = (v: string | null) => (v === null ? null : new Date(v).toISOString());

/** Map a view row to the API item (= engine `Candidate` shape). */
export function toApiItem(r: PublicOccurrenceRow) {
  const permission = r.data_permission_status ?? "unverified";
  return {
    occurrenceId: r.occurrence_id,
    activityId: r.activity_id,
    title: r.title,
    kind: r.kind,
    categories: r.categories,
    shortSummary: r.short_summary,
    durationMinMinutes: r.duration_min_minutes,
    durationMaxMinutes: r.duration_max_minutes,
    venue: { id: r.venue_id, name: r.venue_name, lat: r.lat, lng: r.lng, address: r.address, timezone: r.venue_timezone },
    startsAt: iso(r.starts_at_utc),
    endsAt: iso(r.ends_at_utc),
    originalTimezone: r.original_timezone,
    endTimeQuality: r.end_time_quality,
    cancellationStatus: r.cancellation_status,
    requiresBooking: r.requires_booking,
    availability: {
      state: r.booking_state,
      verifiedAt: iso(r.verified_at),
      expiresAt: iso(r.expires_at),
      verificationSource: r.verification_source,
    },
    source: {
      name: r.source_name ?? "unknown",
      externalId: r.occurrence_id,
      url: r.source_url,
      permission,
      lastSourceUpdate: iso(r.last_source_update),
      isDemo: permission === "synthetic",
    },
  };
}
