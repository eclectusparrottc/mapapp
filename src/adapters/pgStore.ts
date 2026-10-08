import type { NormalizedRecord, RecordStore, SyncRunRow } from "./types";

/** Minimal query surface shared by `pg` (CLI) and PGlite (tests). */
export interface SqlExecutor {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

/**
 * Server-side store for the importer. Must run with a privileged role (service_role / owner);
 * client roles have no write grants by design (see migration).
 */
export class PgStore implements RecordStore {
  constructor(private readonly db: SqlExecutor) {}

  async upsert(records: NormalizedRecord[]): Promise<void> {
    await this.db.query("begin");
    try {
      for (const r of records) {
        const v = r.venue;
        await this.db.query(
          `insert into public.venues (id, name, lat, lng, address, timezone, source_metadata)
           values ($1,$2,$3,$4,$5,$6,$7::jsonb)
           on conflict (id) do update set name=excluded.name, lat=excluded.lat, lng=excluded.lng,
             address=excluded.address, timezone=excluded.timezone, source_metadata=excluded.source_metadata, updated_at=now()`,
          [v.id, v.name, v.lat, v.lng, v.address, v.timezone, JSON.stringify(v.source_metadata)],
        );
        const a = r.activity;
        await this.db.query(
          `insert into public.activities (id, title, kind, category, short_summary, duration_min_minutes,
             duration_max_minutes, venue_id, status, source_url, requires_booking)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (id) do update set title=excluded.title, kind=excluded.kind, category=excluded.category,
             short_summary=excluded.short_summary, duration_min_minutes=excluded.duration_min_minutes,
             duration_max_minutes=excluded.duration_max_minutes, venue_id=excluded.venue_id, status=excluded.status,
             source_url=excluded.source_url, requires_booking=excluded.requires_booking, updated_at=now()`,
          [a.id, a.title, a.kind, a.category, a.short_summary, a.duration_min_minutes, a.duration_max_minutes,
            a.venue_id, a.status, a.source_url, a.requires_booking],
        );
        const o = r.occurrence;
        await this.db.query(
          `insert into public.occurrences (id, activity_id, starts_at_utc, ends_at_utc, original_timezone,
             end_time_quality, recurrence_info, cancellation_status)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (id) do update set starts_at_utc=excluded.starts_at_utc, ends_at_utc=excluded.ends_at_utc,
             original_timezone=excluded.original_timezone, end_time_quality=excluded.end_time_quality,
             recurrence_info=excluded.recurrence_info, cancellation_status=excluded.cancellation_status, updated_at=now()`,
          [o.id, o.activity_id, o.starts_at_utc, o.ends_at_utc, o.original_timezone, o.end_time_quality,
            o.recurrence_info, o.cancellation_status],
        );
        const s = r.availability;
        // Append a snapshot only when the state actually changed (keeps re-imports idempotent).
        await this.db.query(
          `insert into public.availability_snapshots (occurrence_id, booking_state, verified_at, expires_at, verification_source)
           select $1,$2::public.booking_state,$3::timestamptz,$4::timestamptz,$5
           where not exists (
             select 1 from (
               select booking_state, verified_at, expires_at, verification_source
               from public.availability_snapshots where occurrence_id = $1
               order by recorded_at desc, id desc limit 1
             ) last
             where last.booking_state = $2::public.booking_state
               and last.verified_at is not distinct from $3::timestamptz
               and last.expires_at is not distinct from $4::timestamptz
               and last.verification_source is not distinct from $5
           )`,
          [s.occurrence_id, s.booking_state, s.verified_at, s.expires_at, s.verification_source],
        );
        const sr = r.sourceRecord;
        await this.db.query(
          `insert into public.source_records (source_name, external_id, occurrence_id, source_url, last_seen_at,
             data_permission_status, last_source_update, raw_hash)
           values ($1,$2,$3,$4,$5,$6,$7,$8)
           on conflict (source_name, external_id) do update set occurrence_id=excluded.occurrence_id,
             source_url=excluded.source_url, last_seen_at=excluded.last_seen_at,
             data_permission_status=excluded.data_permission_status, last_source_update=excluded.last_source_update,
             raw_hash=excluded.raw_hash`,
          [sr.source_name, sr.external_id, sr.occurrence_id, sr.source_url, sr.last_seen_at,
            sr.data_permission_status, sr.last_source_update, sr.raw_hash],
        );
      }
      await this.db.query("commit");
    } catch (err) {
      await this.db.query("rollback");
      throw err;
    }
  }

  async recordSyncRun(run: SyncRunRow & { error_message?: string }): Promise<void> {
    await this.db.query(
      `insert into public.sync_runs (id, source_name, started_at, finished_at, status, received_count,
         accepted_count, rejected_count, error_summary, error_message)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
      [run.id, run.source_name, run.started_at, run.finished_at, run.status, run.received_count,
        run.accepted_count, run.rejected_count, JSON.stringify(run.error_summary), run.error_message ?? null],
    );
  }
}
