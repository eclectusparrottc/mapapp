import { randomUUID } from "node:crypto";
import type { Candidate } from "../domain/types";
import type {
  NormalizedRecord,
  QualityCode,
  RecordStore,
  RowResult,
  SourceAdapter,
  SyncRunRow,
} from "./types";

/**
 * runSync: fetch -> validate/normalize -> dedupe -> upsert -> audit (directive P1.3).
 * Re-entrancy guarded per source in-process AND via store.tryLock (advisory lock across processes);
 * every run that acquired the lock writes a sync_runs row, including failures.
 * Full-snapshot sources retire records that disappeared from the source (deletion rule, ADR-005).
 */

const running = new Set<string>();

export class SyncAlreadyRunningError extends Error {}

export interface SyncReport {
  run: SyncRunRow;
  rows: RowResult[];
}

export async function runSync<Raw>(
  adapter: SourceAdapter<Raw>,
  store: RecordStore,
  opts: { now?: string; timeoutMs?: number; dryRun?: boolean } = {},
): Promise<SyncReport> {
  if (running.has(adapter.sourceName)) {
    throw new SyncAlreadyRunningError(`sync for ${adapter.sourceName} is already running`);
  }
  running.add(adapter.sourceName);
  if (!opts.dryRun && store.tryLock && !(await store.tryLock(adapter.sourceName))) {
    running.delete(adapter.sourceName);
    throw new SyncAlreadyRunningError(`sync for ${adapter.sourceName} is running in another process`);
  }
  const now = opts.now ?? new Date().toISOString();
  const run: SyncRunRow = {
    id: randomUUID(),
    source_name: adapter.sourceName,
    started_at: new Date().toISOString(),
    finished_at: null,
    status: "running",
    received_count: 0,
    accepted_count: 0,
    rejected_count: 0,
    retired_count: 0,
    error_summary: {},
  };
  const bump = (code: QualityCode | "fetch_error") => {
    run.error_summary[code] = (run.error_summary[code] ?? 0) + 1;
  };
  const rows: RowResult[] = [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
    let raws: Raw[];
    try {
      raws = await adapter.fetch(controller.signal);
    } finally {
      clearTimeout(timer);
    }
    run.received_count = raws.length;

    const byOccurrence = new Map<string, NormalizedRecord>();
    raws.forEach((raw, index) => {
      const { record, issues } = adapter.normalize(raw, { now, index });
      for (const i of issues) bump(i.code);
      const externalId = record?.sourceRecord.external_id ?? null;
      if (!record) {
        rows.push({ index, externalId, accepted: false, issues });
        return;
      }
      if (byOccurrence.has(record.occurrence.id)) {
        const dup = { code: "duplicate" as const, severity: "reject" as const, message: `duplicate of ${record.occurrence.id} in this batch` };
        bump("duplicate");
        rows.push({ index, externalId, accepted: false, issues: [...issues, dup] });
        return;
      }
      byOccurrence.set(record.occurrence.id, record);
      rows.push({ index, externalId, accepted: true, issues });
    });

    run.accepted_count = byOccurrence.size;
    run.rejected_count = rows.filter((r) => !r.accepted).length;
    if (!opts.dryRun) {
      await store.upsert([...byOccurrence.values()]);
      // Only after a successful fetch of a full snapshot (never when fetch failed). Rows rejected in this
      // run count as missing on purpose: invalid data must not stay public.
      if (adapter.fullSnapshot && store.retireMissing) {
        run.retired_count = await store.retireMissing(adapter.sourceName, now);
      }
    }
    run.status = run.rejected_count === 0 ? "succeeded" : run.accepted_count > 0 ? "partial" : "failed";
  } catch (err) {
    run.status = "failed";
    bump("fetch_error");
    (run as SyncRunRow & { error_message?: string }).error_message = err instanceof Error ? err.message : String(err);
  } finally {
    run.finished_at = new Date().toISOString();
    running.delete(adapter.sourceName);
    if (!opts.dryRun) {
      await store.recordSyncRun(run);
      await store.unlock?.(adapter.sourceName);
    }
  }
  return { run, rows };
}

/** Reference store used by tests and the CLI dry-run. Same keys as the SQL schema. */
export class InMemoryStore implements RecordStore {
  venues = new Map<string, NormalizedRecord["venue"]>();
  activities = new Map<string, NormalizedRecord["activity"]>();
  occurrences = new Map<string, NormalizedRecord["occurrence"]>();
  availability = new Map<string, NormalizedRecord["availability"]>();
  sourceRecords = new Map<string, NormalizedRecord["sourceRecord"]>();
  syncRuns: SyncRunRow[] = [];

  async upsert(records: NormalizedRecord[]): Promise<void> {
    for (const r of records) {
      this.venues.set(r.venue.id, r.venue);
      this.activities.set(r.activity.id, r.activity);
      this.occurrences.set(r.occurrence.id, r.occurrence);
      this.availability.set(r.availability.occurrence_id, r.availability);
      this.sourceRecords.set(`${r.sourceRecord.source_name}|${r.sourceRecord.external_id}`, r.sourceRecord);
    }
  }

  async recordSyncRun(run: SyncRunRow): Promise<void> {
    this.syncRuns.push({ ...run });
  }

  async retireMissing(sourceName: string, seenAt: string): Promise<number> {
    let n = 0;
    for (const [key, sr] of this.sourceRecords) {
      if (sr.source_name === sourceName && sr.last_seen_at < seenAt) {
        this.sourceRecords.delete(key);
        n++;
      }
    }
    return n;
  }

  /** Join rows into engine candidates (what the public read API returns). */
  toCandidates(): Candidate[] {
    const out: Candidate[] = [];
    for (const sr of this.sourceRecords.values()) {
      const occ = this.occurrences.get(sr.occurrence_id)!;
      const act = this.activities.get(occ.activity_id)!;
      const venue = this.venues.get(act.venue_id)!;
      const av = this.availability.get(occ.id)!;
      out.push(rowsToCandidate({ venue, activity: act, occurrence: occ, availability: av, sourceRecord: sr }));
    }
    return out.sort((a, b) => a.occurrenceId.localeCompare(b.occurrenceId));
  }
}

export function rowsToCandidate(r: Omit<NormalizedRecord, "flags">): Candidate {
  return {
    occurrenceId: r.occurrence.id,
    activityId: r.activity.id,
    title: r.activity.title,
    kind: r.activity.kind,
    categories: r.activity.category,
    shortSummary: r.activity.short_summary,
    durationMinMinutes: r.activity.duration_min_minutes,
    durationMaxMinutes: r.activity.duration_max_minutes,
    venue: { id: r.venue.id, name: r.venue.name, lat: r.venue.lat, lng: r.venue.lng, address: r.venue.address, timezone: r.venue.timezone },
    startsAt: r.occurrence.starts_at_utc,
    endsAt: r.occurrence.ends_at_utc,
    originalTimezone: r.occurrence.original_timezone,
    endTimeQuality: r.occurrence.end_time_quality,
    cancellationStatus: r.occurrence.cancellation_status,
    requiresBooking: r.activity.requires_booking,
    availability: {
      state: r.availability.booking_state,
      verifiedAt: r.availability.verified_at,
      expiresAt: r.availability.expires_at,
      verificationSource: r.availability.verification_source,
    },
    source: {
      name: r.sourceRecord.source_name,
      externalId: r.sourceRecord.external_id,
      url: r.sourceRecord.source_url,
      permission: r.sourceRecord.data_permission_status,
      lastSourceUpdate: r.sourceRecord.last_source_update,
      isDemo: r.sourceRecord.data_permission_status === "synthetic",
    },
  };
}
