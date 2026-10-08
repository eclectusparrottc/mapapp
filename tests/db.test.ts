import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { csvAdapter } from "../src/adapters/csv";
import { PgStore } from "../src/adapters/pgStore";
import { runSync } from "../src/adapters/sync";
import { asRole as asRoleOn, freshDb } from "./pgliteDb";

/**
 * Rebuilds the schema from zero on real Postgres (PGlite) and checks the security model:
 * anon can read only displayable rows through the view, and can write nothing.
 */
const root = join(__dirname, "..");
const csvText = readFileSync(join(root, "data", "samples", "curated_sample.csv"), "utf8");
const NOW = "2026-10-10T12:00:00Z";

let db: PGlite;
const asRole = <T>(role: string, fn: () => Promise<T>) => asRoleOn(db, role, fn);

beforeAll(async () => {
  db = await freshDb();
  await runSync(csvAdapter("curated-csv", async () => csvText), new PgStore(db), { now: NOW });
});

describe("Supabase schema + RLS (migration rebuilt from zero)", () => {
  it("imports CSV rows into all tables", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.occurrences");
    expect(rows[0]!.n).toBe(7);
    const runs = await db.query<{ status: string; accepted_count: number }>("select status, accepted_count from public.sync_runs");
    expect(runs.rows).toEqual([{ status: "partial", accepted_count: 7 }]);
  });

  it("re-import is idempotent (no duplicate occurrences or snapshots)", async () => {
    await runSync(csvAdapter("curated-csv", async () => csvText), new PgStore(db), { now: NOW });
    const occ = await db.query<{ n: number }>("select count(*)::int as n from public.occurrences");
    const snaps = await db.query<{ n: number }>("select count(*)::int as n from public.availability_snapshots");
    const runs = await db.query<{ n: number }>("select count(*)::int as n from public.sync_runs");
    expect(occ.rows[0]!.n).toBe(7);
    expect(snaps.rows[0]!.n).toBe(7);
    expect(runs.rows[0]!.n).toBe(2);
  });

  it("anon reads only publicly displayable rows via the view", async () => {
    const rows = await asRole("anon", async () =>
      (await db.query<{ occurrence_id: string; data_permission_status: string }>(
        "select occurrence_id, data_permission_status from public.public_occurrences_v1 order by 1",
      )).rows,
    );
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.data_permission_status === "synthetic")).toBe(true);
    expect(rows.map((r) => r.occurrence_id)).not.toContain("curated-csv:csv-thirdparty:2026-10-11T19:00");
  });

  it("anon cannot see source_records or sync_runs", async () => {
    for (const table of ["public.source_records", "public.sync_runs"]) {
      await expect(asRole("anon", () => db.query(`select * from ${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("anon and authenticated cannot write anything", async () => {
    for (const role of ["anon", "authenticated"]) {
      await expect(
        asRole(role, () => db.query("insert into public.venues (id, name, timezone) values ('x','x','UTC')")),
      ).rejects.toThrow(/permission denied/);
      await expect(asRole(role, () => db.query("update public.activities set title = 'pwned'"))).rejects.toThrow(
        /permission denied/,
      );
      await expect(asRole(role, () => db.query("delete from public.occurrences"))).rejects.toThrow(/permission denied/);
      await expect(
        asRole(role, () => db.query("insert into public.sync_runs (source_name, started_at, status) values ('x', now(), 'failed')")),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("database constraints reject dishonest data", async () => {
    await expect(
      db.query(
        "insert into public.availability_snapshots (occurrence_id, booking_state) values ('curated-csv:csv-talk:2026-10-12T12:15', 'verified_available')",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        "update public.occurrences set end_time_quality = 'known', ends_at_utc = null where id = 'curated-csv:csv-busker:2026-10-10T17:30'",
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query("update public.activities set source_url = 'javascript:alert(1)' where id = 'curated-csv:csv-talk'"),
    ).rejects.toThrow(/check constraint/);
  });
});
