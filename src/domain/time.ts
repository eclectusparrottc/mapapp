/**
 * Time rules (ADR-006): compute in UTC, display in America/Vancouver with the zone
 * abbreviation, and treat local wall-clock input as potentially ambiguous (DST fall-back)
 * or non-existent (DST spring-forward). No date library: Intl is DST-correct.
 */

export const DISPLAY_TZ = "America/Vancouver";

export const MINUTE_MS = 60_000;

export function addMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * MINUTE_MS).toISOString();
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / MINUTE_MS;
}

function partsInZone(epochMs: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(new Date(epochMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset (minutes) of `timeZone` from UTC at the given instant. Vancouver: -420 (PDT) or -480 (PST). */
export function zoneOffsetMinutes(epochMs: number, timeZone: string): number {
  const p = partsInZone(epochMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(epochMs / 1000) * 1000) / MINUTE_MS);
}

export type LocalTimeResolution =
  | { kind: "exact"; utc: string }
  /** Wall time occurs twice (fall back). `utc` is the earlier instant; `alternativeUtc` the later. */
  | { kind: "ambiguous"; utc: string; alternativeUtc: string }
  /** Wall time skipped (spring forward). `utc` is shifted forward by the gap, as browsers do. */
  | { kind: "nonexistent"; utc: string };

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Convert a wall-clock string like "2026-11-01T01:30" in `timeZone` to UTC, reporting DST edge cases. */
export function localToUtc(local: string, timeZone: string = DISPLAY_TZ): LocalTimeResolution {
  const m = LOCAL_RE.exec(local);
  if (!m) throw new Error(`Invalid local datetime: ${local}`);
  const [, y, mo, d, h, mi, s] = m;
  const wallAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0));

  // Candidate offsets: the zone's offset a day before and after the wall time covers any single transition.
  const offsets = new Set([
    zoneOffsetMinutes(wallAsUtc - 24 * 60 * MINUTE_MS, timeZone),
    zoneOffsetMinutes(wallAsUtc + 24 * 60 * MINUTE_MS, timeZone),
  ]);
  const matches: number[] = [];
  for (const off of offsets) {
    const instant = wallAsUtc - off * MINUTE_MS;
    if (zoneOffsetMinutes(instant, timeZone) === off) matches.push(instant);
  }
  matches.sort((a, b) => a - b);

  if (matches.length === 1) return { kind: "exact", utc: new Date(matches[0]!).toISOString() };
  if (matches.length === 2) {
    return {
      kind: "ambiguous",
      utc: new Date(matches[0]!).toISOString(),
      alternativeUtc: new Date(matches[1]!).toISOString(),
    };
  }
  // Skipped wall time: interpret with the pre-transition offset, which lands after the gap.
  const before = zoneOffsetMinutes(wallAsUtc - 24 * 60 * MINUTE_MS, timeZone);
  return { kind: "nonexistent", utc: new Date(wallAsUtc - before * MINUTE_MS).toISOString() };
}

/** e.g. "7:30 PM PDT". Always includes the zone so users never see a bare UTC-derived time. */
export function formatLocalTime(iso: string, timeZone: string = DISPLAY_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  })
    .format(new Date(iso))
    .replace(/\s+/g, " ")
    .replace(/a\.m\./i, "AM")
    .replace(/p\.m\./i, "PM");
}

/** e.g. "Sat, Oct 10, 7:30 PM PDT". */
export function formatLocalDateTime(iso: string, timeZone: string = DISPLAY_TZ): string {
  const date = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
  return `${date}, ${formatLocalTime(iso, timeZone)}`;
}

/** Local calendar date (YYYY-MM-DD) of an instant in the zone. */
export function localDate(iso: string, timeZone: string = DISPLAY_TZ): string {
  const p = partsInZone(Date.parse(iso), timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
