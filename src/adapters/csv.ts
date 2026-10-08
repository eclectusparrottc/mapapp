import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { isInServiceArea } from "../domain/geo";
import { localToUtc } from "../domain/time";
import {
  ActivityKind,
  BookingState,
  CancellationStatus,
  Category,
  DataPermissionStatus,
  EndTimeQuality,
} from "../domain/types";
import type { NormalizedRecord, QualityIssue, SourceAdapter } from "./types";

/**
 * Curated CSV adapter (directive P1.3, first source). Column contract: docs/CSV_FORMAT.md.
 * Times are local wall-clock + IANA timezone; stored as UTC.
 */

export const CSV_COLUMNS = [
  "external_id",
  "occurrence_key",
  "title",
  "kind",
  "categories",
  "short_summary",
  "duration_min_minutes",
  "duration_max_minutes",
  "venue_external_id",
  "venue_name",
  "lat",
  "lng",
  "address",
  "timezone",
  "starts_at_local",
  "ends_at_local",
  "end_time_quality",
  "cancellation_status",
  "booking_state",
  "booking_verified_at",
  "booking_expires_at",
  "requires_booking",
  "source_url",
  "data_permission_status",
  "last_source_update",
] as const;

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

const blank = (s: string | undefined) => s === undefined || s.trim() === "";
const opt = (s: string | undefined) => (blank(s) ? null : s!.trim());

const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isSafeHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function parseIntOrNull(s: string | undefined): number | null | "invalid" {
  if (blank(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 && n <= 24 * 60 ? n : "invalid";
}

function parseBool(s: string | undefined): boolean | null | "invalid" {
  if (blank(s)) return null;
  const v = s!.trim().toLowerCase();
  if (["true", "yes", "1"].includes(v)) return true;
  if (["false", "no", "0"].includes(v)) return false;
  return "invalid";
}

function parseIsoOrNull(s: string | undefined): string | null | "invalid" {
  if (blank(s)) return null;
  const t = Date.parse(s!);
  return Number.isNaN(t) || !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s!.trim()) ? "invalid" : new Date(t).toISOString();
}

export function rawHash(row: Record<string, string>): string {
  const canonical = CSV_COLUMNS.map((c) => `${c}=${(row[c] ?? "").trim()}`).join("\u001f");
  return createHash("sha256").update(canonical).digest("hex");
}

export function normalizeCsvRow(
  sourceName: string,
  row: Partial<CsvRow>,
  ctx: { now: string },
): { record: NormalizedRecord | null; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  const reject = (code: QualityIssue["code"], field: string, message: string) =>
    issues.push({ code, severity: "reject", field, message });
  const flag = (code: QualityIssue["code"], field: string, message: string) =>
    issues.push({ code, severity: "flag", field, message });

  const externalId = opt(row.external_id);
  const occKey = opt(row.occurrence_key) ?? "default";
  const venueExt = opt(row.venue_external_id);
  if (!externalId || !SAFE_ID.test(externalId)) reject("invalid_value", "external_id", "missing or unsafe external_id");
  if (!SAFE_ID.test(occKey)) reject("invalid_value", "occurrence_key", "unsafe occurrence_key");
  if (!venueExt || !SAFE_ID.test(venueExt)) reject("invalid_value", "venue_external_id", "missing or unsafe venue_external_id");

  const title = opt(row.title);
  if (!title || title.length > 200) reject("invalid_value", "title", "title missing or longer than 200 chars");
  const venueName = opt(row.venue_name);
  if (!venueName) reject("invalid_value", "venue_name", "venue_name missing");

  const kind = ActivityKind.safeParse(opt(row.kind));
  if (!kind.success) reject("invalid_value", "kind", `kind must be one of ${ActivityKind.options.join("|")}`);

  const cats = (opt(row.categories) ?? "").split("|").map((c) => c.trim()).filter(Boolean);
  const parsedCats = z.array(Category).safeParse(cats);
  if (!parsedCats.success) reject("invalid_value", "categories", `unknown category in "${row.categories}"`);

  const durMin = parseIntOrNull(row.duration_min_minutes);
  const durMax = parseIntOrNull(row.duration_max_minutes);
  if (durMin === "invalid") reject("invalid_value", "duration_min_minutes", "must be a positive integer");
  if (durMax === "invalid") reject("invalid_value", "duration_max_minutes", "must be a positive integer");
  if (typeof durMin === "number" && typeof durMax === "number" && durMax < durMin) {
    reject("invalid_value", "duration_max_minutes", "max < min");
  }

  // Coordinates: missing is allowed but flagged (never distance-ranked); out-of-area is rejected.
  const lat = blank(row.lat) ? null : Number(row.lat);
  const lng = blank(row.lng) ? null : Number(row.lng);
  if (lat === null || lng === null) {
    flag("missing_coordinates", "lat,lng", "no coordinates; will not appear on map or be distance-ranked");
  } else if (!isInServiceArea({ lat, lng })) {
    reject("invalid_value", "lat,lng", `coordinates ${lat},${lng} outside Metro Vancouver service area`);
  }

  const tz = opt(row.timezone);
  if (!tz || !isValidTimezone(tz)) reject("unknown_timezone", "timezone", `unknown timezone "${row.timezone ?? ""}"`);

  const toUtc = (field: "starts_at_local" | "ends_at_local"): string | null => {
    const local = opt(row[field]);
    if (!local || !tz || !isValidTimezone(tz)) return null;
    try {
      const r = localToUtc(local, tz);
      if (r.kind === "nonexistent") {
        reject("invalid_value", field, `${local} does not exist in ${tz} (DST gap)`);
        return null;
      }
      if (r.kind === "ambiguous") flag("ambiguous_local_time", field, `${local} occurs twice in ${tz}; used the earlier instant`);
      return r.utc;
    } catch {
      reject("invalid_value", field, `"${local}" is not YYYY-MM-DDTHH:MM`);
      return null;
    }
  };
  const startsAt = toUtc("starts_at_local");
  const endsAt = toUtc("ends_at_local");
  if (kind.success && kind.data !== "drop_in" && !opt(row.starts_at_local)) {
    reject("missing_time", "starts_at_local", "scheduled events and bookable slots need a start time");
  }
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    reject("invalid_value", "ends_at_local", "end is not after start");
  }

  const endQ = EndTimeQuality.safeParse(opt(row.end_time_quality) ?? (endsAt ? "known" : "unknown"));
  if (!endQ.success) reject("invalid_value", "end_time_quality", "must be known|estimated|unknown");
  if (endQ.success && endQ.data !== "unknown" && !opt(row.ends_at_local)) {
    reject("invalid_value", "end_time_quality", `end_time_quality=${endQ.data} but no end time given`);
  }

  const cancel = CancellationStatus.safeParse(opt(row.cancellation_status) ?? "scheduled");
  if (!cancel.success) reject("invalid_value", "cancellation_status", "must be scheduled|cancelled|postponed");
  else if (cancel.data !== "scheduled") flag("cancelled", "cancellation_status", `occurrence is ${cancel.data}`);

  const booking = BookingState.safeParse(opt(row.booking_state) ?? "unknown");
  if (!booking.success) reject("invalid_value", "booking_state", `must be one of ${BookingState.options.join("|")}`);
  const verifiedAt = parseIsoOrNull(row.booking_verified_at);
  const expiresAt = parseIsoOrNull(row.booking_expires_at);
  if (verifiedAt === "invalid") reject("invalid_value", "booking_verified_at", "must be ISO-8601 with offset");
  if (expiresAt === "invalid") reject("invalid_value", "booking_expires_at", "must be ISO-8601 with offset");
  if (booking.success && booking.data === "verified_available" && (verifiedAt === null || expiresAt === null)) {
    reject("invalid_value", "booking_state", "verified_available requires booking_verified_at and booking_expires_at");
  }

  const reqBooking = parseBool(row.requires_booking);
  if (reqBooking === "invalid") reject("invalid_value", "requires_booking", "must be true|false or blank");

  const url = opt(row.source_url);
  if (url && !isSafeHttpUrl(url)) reject("invalid_uri", "source_url", `"${url}" is not an http(s) URL`);

  const perm = DataPermissionStatus.safeParse(opt(row.data_permission_status) ?? "unverified");
  if (!perm.success) reject("invalid_value", "data_permission_status", "must be authorized|synthetic|unverified|denied");
  else if (perm.data === "unverified" || perm.data === "denied") {
    flag("license_unknown", "data_permission_status", `permission=${perm.data}; stored but never shown publicly`);
  }

  const lastUpdate = parseIsoOrNull(row.last_source_update);
  if (lastUpdate === "invalid") reject("invalid_value", "last_source_update", "must be ISO-8601 with offset");

  if (endsAt && Date.parse(endsAt) <= Date.parse(ctx.now)) {
    reject("expired_source", "ends_at_local", "occurrence already ended");
  }

  if (issues.some((i) => i.severity === "reject")) return { record: null, issues };

  const activityId = `${sourceName}:${externalId}`;
  const occurrenceId = `${activityId}:${occKey}`;
  const venueId = `${sourceName}:${venueExt}`;
  const k = kind.success ? kind.data : "drop_in";
  return {
    issues,
    record: {
      venue: { id: venueId, name: venueName!, lat, lng, address: opt(row.address), timezone: tz!, source_metadata: { source: sourceName } },
      activity: {
        id: activityId,
        title: title!,
        kind: k,
        category: parsedCats.success ? parsedCats.data : [],
        short_summary: (opt(row.short_summary) ?? "").slice(0, 280),
        duration_min_minutes: durMin as number | null,
        duration_max_minutes: durMax as number | null,
        venue_id: venueId,
        status: "active",
        source_url: url,
        requires_booking: reqBooking as boolean | null,
      },
      occurrence: {
        id: occurrenceId,
        activity_id: activityId,
        starts_at_utc: startsAt,
        ends_at_utc: endsAt,
        original_timezone: tz!,
        end_time_quality: endQ.success ? endQ.data : "unknown",
        recurrence_info: null,
        cancellation_status: cancel.success ? cancel.data : "scheduled",
      },
      availability: {
        occurrence_id: occurrenceId,
        booking_state: booking.success ? booking.data : "unknown",
        verified_at: verifiedAt as string | null,
        expires_at: expiresAt as string | null,
        verification_source: booking.success && booking.data !== "unknown" ? sourceName : null,
      },
      sourceRecord: {
        source_name: sourceName,
        external_id: `${externalId}:${occKey}`,
        occurrence_id: occurrenceId,
        source_url: url,
        last_seen_at: ctx.now,
        data_permission_status: perm.success ? perm.data : "unverified",
        last_source_update: lastUpdate as string | null,
        raw_hash: rawHash(row as Record<string, string>),
      },
      flags: issues,
    },
  };
}

export function parseCsv(text: string): Array<Partial<CsvRow>> {
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Array<Record<string, string>>;
  const header = rows.length ? Object.keys(rows[0]!) : [];
  const missing = CSV_COLUMNS.filter((c) => rows.length && !header.includes(c));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}`);
  return rows as Array<Partial<CsvRow>>;
}

export function csvAdapter(sourceName: string, readText: () => Promise<string>): SourceAdapter<Partial<CsvRow>> {
  if (!SAFE_ID.test(sourceName)) throw new Error(`unsafe source name ${sourceName}`);
  return {
    sourceName,
    async fetch() {
      return parseCsv(await readText());
    },
    normalize(raw, ctx) {
      return normalizeCsvRow(sourceName, raw, ctx);
    },
  };
}
