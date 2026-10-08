import type {
  ActivityKind,
  BookingState,
  CancellationStatus,
  Category,
  DataPermissionStatus,
  EndTimeQuality,
} from "../domain/types";

/** Data-quality issue codes (directive P1.3). `severity: reject` keeps the row out of the store. */
export type QualityCode =
  | "missing_time"
  | "missing_coordinates"
  | "unknown_timezone"
  | "ambiguous_local_time"
  | "invalid_uri"
  | "invalid_value"
  | "duplicate"
  | "cancelled"
  | "expired_source"
  | "license_unknown";

export interface QualityIssue {
  code: QualityCode;
  severity: "reject" | "flag";
  field?: string;
  message: string;
}

/** Normalized rows, 1:1 with the Supabase tables in supabase/migrations. */
export interface VenueRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  timezone: string;
  source_metadata: Record<string, unknown>;
}

export interface ActivityRow {
  id: string;
  title: string;
  kind: ActivityKind;
  category: Category[];
  short_summary: string;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  venue_id: string;
  status: "active" | "inactive";
  source_url: string | null;
  requires_booking: boolean | null;
}

export interface OccurrenceRow {
  id: string;
  activity_id: string;
  starts_at_utc: string | null;
  ends_at_utc: string | null;
  original_timezone: string;
  end_time_quality: EndTimeQuality;
  recurrence_info: string | null;
  cancellation_status: CancellationStatus;
}

export interface AvailabilitySnapshotRow {
  occurrence_id: string;
  booking_state: BookingState;
  verified_at: string | null;
  expires_at: string | null;
  verification_source: string | null;
}

export interface SourceRecordRow {
  source_name: string;
  external_id: string;
  occurrence_id: string;
  source_url: string | null;
  last_seen_at: string;
  data_permission_status: DataPermissionStatus;
  last_source_update: string | null;
  raw_hash: string;
}

export interface NormalizedRecord {
  venue: VenueRow;
  activity: ActivityRow;
  occurrence: OccurrenceRow;
  availability: AvailabilitySnapshotRow;
  sourceRecord: SourceRecordRow;
  flags: QualityIssue[];
}

export interface SyncRunRow {
  id: string;
  source_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "succeeded" | "partial" | "failed";
  received_count: number;
  accepted_count: number;
  rejected_count: number;
  /** Records of this source no longer present in a full-snapshot import, removed from public view. */
  retired_count: number;
  error_summary: Partial<Record<QualityCode | "fetch_error", number>>;
}

export interface RowResult {
  index: number;
  externalId: string | null;
  accepted: boolean;
  issues: QualityIssue[];
}

/** fetch -> validate raw -> normalize -> (dedupe/upsert/audit handled by runSync). */
export interface SourceAdapter<Raw> {
  readonly sourceName: string;
  /** True when each fetch returns the complete current set (e.g. a curated CSV): missing records get retired. */
  readonly fullSnapshot: boolean;
  fetch(signal: AbortSignal): Promise<Raw[]>;
  /** Validate and normalize one raw row. Must be pure and deterministic for a given `now`. */
  normalize(raw: Raw, ctx: { now: string; index: number }): { record: NormalizedRecord | null; issues: QualityIssue[] };
}

export interface RecordStore {
  /** Idempotent upsert keyed by the stable ids. Returns nothing; must not create duplicates. */
  upsert(records: NormalizedRecord[]): Promise<void>;
  recordSyncRun(run: SyncRunRow): Promise<void>;
  /** Cross-process lock per source (e.g. Postgres advisory lock). Returns false if already held. */
  tryLock?(sourceName: string): Promise<boolean>;
  unlock?(sourceName: string): Promise<void>;
  /** Remove source records of `sourceName` last seen before `seenAt` (no longer public). Returns count. */
  retireMissing?(sourceName: string, seenAt: string): Promise<number>;
}
