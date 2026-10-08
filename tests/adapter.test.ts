import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, csvAdapter, normalizeCsvRow, parseCsv } from "../src/adapters/csv";
import { InMemoryStore, runSync, SyncAlreadyRunningError } from "../src/adapters/sync";
import { recommendFromCandidates } from "../src/engine/feasibility";

const NOW = "2026-10-10T12:00:00Z";
const csvText = readFileSync(join(__dirname, "..", "data", "samples", "curated_sample.csv"), "utf8");
const adapter = () => csvAdapter("curated-csv", async () => csvText);

describe("curated CSV adapter", () => {
  it("accepts good rows, rejects bad rows with classified reasons", async () => {
    const store = new InMemoryStore();
    const { run, rows } = await runSync(adapter(), store, { now: NOW });
    const byId = (id: string) => rows.filter((r) => r.externalId?.startsWith(id));
    const rejectedCodes = rows.filter((r) => !r.accepted).map((r) => r.issues.filter((i) => i.severity === "reject").map((i) => i.code));

    expect(run.received_count).toBe(14);
    expect(run.accepted_count).toBe(7);
    expect(run.rejected_count).toBe(7);
    expect(run.status).toBe("partial");
    expect(rejectedCodes).toEqual([
      ["missing_time"],
      ["unknown_timezone"],
      ["invalid_uri"],
      ["invalid_value"],
      ["expired_source"],
      ["invalid_value"],
      ["duplicate"],
    ]);
    expect(run.error_summary).toMatchObject({
      missing_time: 1,
      unknown_timezone: 1,
      invalid_uri: 1,
      expired_source: 1,
      duplicate: 1,
      cancelled: 1,
      missing_coordinates: 1,
      license_unknown: 1,
    });
    expect(run.error_summary.ambiguous_local_time).toBeUndefined();
    expect(byId("csv-gallery")).toHaveLength(2);
    expect(store.syncRuns).toHaveLength(1);
  });

  it("flags DST-ambiguous local times and uses the earlier instant", () => {
    const row = Object.fromEntries(CSV_COLUMNS.map((c) => [c, ""])) as Record<(typeof CSV_COLUMNS)[number], string>;
    Object.assign(row, {
      external_id: "amb", occurrence_key: "k", title: "Ambiguous", kind: "scheduled_event", categories: "music",
      venue_external_id: "v", venue_name: "V", lat: "49.28", lng: "-123.11",
      timezone: "America/Los_Angeles", starts_at_local: "2026-11-01T01:30", data_permission_status: "synthetic",
    });
    const { record, issues } = normalizeCsvRow("t", row, { now: NOW });
    expect(issues.map((i) => i.code)).toContain("ambiguous_local_time");
    expect(record?.occurrence.starts_at_utc).toBe("2026-11-01T08:30:00.000Z");
  });

  it("stores UTC and keeps the original timezone (BC: 2026-11-01 01:30 is a single instant)", async () => {
    const store = new InMemoryStore();
    await runSync(adapter(), store, { now: NOW });
    const talk = store.occurrences.get("curated-csv:csv-talk:2026-10-12T12:15")!;
    expect(talk.starts_at_utc).toBe("2026-10-12T19:15:00.000Z");
    expect(talk.original_timezone).toBe("America/Vancouver");
    const dst = store.occurrences.get("curated-csv:csv-dst:2026-11-01T01:30")!;
    expect(dst.starts_at_utc).toBe("2026-11-01T08:30:00.000Z");
    expect(dst.end_time_quality).toBe("unknown");
    expect(dst.ends_at_utc).toBeNull();
  });

  it("is idempotent: importing the same file twice creates no duplicates", async () => {
    const store = new InMemoryStore();
    await runSync(adapter(), store, { now: NOW });
    const first = store.toCandidates();
    await runSync(adapter(), store, { now: NOW });
    const second = store.toCandidates();
    expect(second.map((c) => c.occurrenceId)).toEqual(first.map((c) => c.occurrenceId));
    expect(second).toHaveLength(7);
    expect(store.syncRuns).toHaveLength(2);
  });

  it("never lets unverified-license rows reach recommendations", async () => {
    const store = new InMemoryStore();
    await runSync(adapter(), store, { now: NOW });
    const res = recommendFromCandidates(
      {
        mode: "free_time",
        now: "2026-10-12T02:00:00Z", // Oct 11 19:00 PDT, when the third-party listing starts
        origin: { label: "x", lat: 49.2745, lng: -123.121, isSample: true },
        freeMinutes: 120,
      },
      store.toCandidates(),
    );
    expect([...res.top, ...res.more].map((r) => r.occurrenceId)).not.toContain("curated-csv:csv-thirdparty:2026-10-11T19:00");
    expect(res.rejected.find((r) => r.occurrenceId.includes("csv-thirdparty"))?.reasons).toEqual(["permission_not_public"]);
  });

  it("records a failed run when the source cannot be fetched", async () => {
    const store = new InMemoryStore();
    const broken = csvAdapter("broken-src", async () => {
      throw new Error("ENOENT");
    });
    const { run } = await runSync(broken, store, { now: NOW });
    expect(run.status).toBe("failed");
    expect(run.error_summary.fetch_error).toBe(1);
    expect(store.syncRuns[0]?.status).toBe("failed");
  });

  it("refuses concurrent runs for the same source", async () => {
    let release!: () => void;
    const slow = csvAdapter("slow-src", () => new Promise((r) => (release = () => r(csvText))));
    const store = new InMemoryStore();
    const first = runSync(slow, store, { now: NOW });
    await expect(runSync(slow, store, { now: NOW })).rejects.toBeInstanceOf(SyncAlreadyRunningError);
    release();
    await first;
  });

  it("rejects files with missing columns", () => {
    expect(() => parseCsv("external_id,title\na,b\n")).toThrow(/missing required columns/);
  });
});
