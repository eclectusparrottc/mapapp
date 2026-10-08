import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { csvAdapter } from "../src/adapters/csv";
import { PgStore } from "../src/adapters/pgStore";
import { runSync } from "../src/adapters/sync";
import { Candidate } from "../src/domain/types";
import { parseActivitiesQuery, type ActivitiesQuery, type PublicOccurrenceRow } from "../supabase/functions/_shared/contract";
import { handle, type OccurrenceRepo } from "../supabase/functions/_shared/handler";
import { asRole, freshDb } from "./pgliteDb";

const NOW = new Date("2026-10-10T12:00:00Z");
const BASE = "https://example.test/functions/v1/activities-api";
const DOWNTOWN_BBOX = "-123.13,49.27,-123.10,49.29";

let db: PGlite;

/** Same filters as postgrestRepo, executed as the anon role so RLS applies exactly as in production. */
function anonSqlRepo(): OccurrenceRepo {
  return {
    list: (q: ActivitiesQuery) =>
      asRole(db, "anon", async () => {
        const params: unknown[] = [q.bbox.minLat, q.bbox.maxLat, q.bbox.minLng, q.bbox.maxLng, q.from, q.to];
        let sql = `select * from public.public_occurrences_v1
          where lat between $1 and $2 and lng between $3 and $4
            and (starts_at_utc < $6 or starts_at_utc is null)
            and (ends_at_utc > $5 or ends_at_utc is null)`;
        if (q.kinds.length) {
          params.push(q.kinds);
          sql += ` and kind::text = any($${params.length})`;
        }
        if (q.categories.length) {
          params.push(q.categories);
          sql += ` and categories && $${params.length}::text[]`;
        }
        params.push(q.limit);
        sql += ` order by starts_at_utc asc nulls first, occurrence_id asc limit $${params.length}`;
        return (await db.query<PublicOccurrenceRow>(sql, params)).rows;
      }),
    get: (id) =>
      asRole(db, "anon", async () =>
        (await db.query<PublicOccurrenceRow>("select * from public.public_occurrences_v1 where occurrence_id = $1", [id]))
          .rows[0] ?? null,
      ),
    ping: async () => {
      await asRole(db, "anon", () => db.query("select 1 from public.public_occurrences_v1 limit 1"));
    },
  };
}

const call = (path: string, init?: RequestInit) => handle(new Request(`${BASE}${path}`, init), anonSqlRepo(), () => NOW);

beforeAll(async () => {
  db = await freshDb();
  const csvText = readFileSync(join(__dirname, "..", "data", "samples", "curated_sample.csv"), "utf8");
  await runSync(csvAdapter("curated-csv", async () => csvText), new PgStore(db), { now: NOW.toISOString() });
});

describe("public read API v1", () => {
  it("healthz", async () => {
    const res = await call("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, version: "v1" });
  });

  it("lists activities in a bbox/time window; items validate as engine Candidates", async () => {
    const res = await call(`/activities?bbox=${DOWNTOWN_BBOX}&from=2026-10-10T12:00:00Z&to=2026-10-11T12:00:00Z`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.items.map((i: { occurrenceId: string }) => i.occurrenceId);
    expect(ids).toContain("curated-csv:csv-gallery:2026-10-10");
    expect(ids).toContain("curated-csv:csv-busker:2026-10-10T17:30");
    // Unverified-license row (Oct 11 19:00 PDT = Oct 12 02:00Z) is outside this window anyway; check by widening below.
    for (const item of body.items) expect(Candidate.safeParse(item).success, JSON.stringify(item)).toBe(true);
    // Rows without coordinates never match a bbox.
    expect(ids).not.toContain("curated-csv:csv-popup:2026-10-10T16:00");
  });

  it("never returns records without display rights", async () => {
    const res = await call(`/activities?bbox=${DOWNTOWN_BBOX}&from=2026-10-11T12:00:00Z&to=2026-10-13T12:00:00Z`);
    const body = await res.json();
    const ids = body.items.map((i: { occurrenceId: string }) => i.occurrenceId);
    expect(ids).toContain("curated-csv:csv-talk:2026-10-12T12:15");
    expect(ids).not.toContain("curated-csv:csv-thirdparty:2026-10-11T19:00");
    const direct = await call("/activities/curated-csv:csv-thirdparty:2026-10-11T19:00");
    expect(direct.status).toBe(404);
  });

  it("filters by kind and category", async () => {
    const res = await call(
      `/activities?bbox=${DOWNTOWN_BBOX}&from=2026-10-10T12:00:00Z&to=2026-10-11T12:00:00Z&kind=drop_in&category=arts`,
    );
    const body = await res.json();
    expect(body.items.map((i: { occurrenceId: string }) => i.occurrenceId)).toEqual(["curated-csv:csv-gallery:2026-10-10"]);
  });

  it("returns a single occurrence with provenance", async () => {
    const res = await call("/activities/curated-csv:csv-talk:2026-10-12T12:15");
    expect(res.status).toBe(200);
    const { item } = await res.json();
    expect(item.source).toMatchObject({ name: "curated-csv", permission: "synthetic", isDemo: true });
    expect(item.availability.state).toBe("sales_open_not_inventory");
    expect(item.startsAt).toBe("2026-10-12T19:15:00.000Z");
  });

  it.each([
    ["missing bbox", "/activities?to=2026-10-11T00:00:00Z"],
    ["huge bbox", "/activities?bbox=-124,48,-122,50&to=2026-10-11T00:00:00Z"],
    ["outside service area", "/activities?bbox=-74.1,40.6,-73.9,40.8&to=2026-10-11T00:00:00Z"],
    ["sql-ish bbox", `/activities?bbox=${encodeURIComponent("1,2,3,4);drop table venues;--")}&to=2026-10-11T00:00:00Z`],
    ["reversed range", `/activities?bbox=${DOWNTOWN_BBOX}&from=2026-10-11T00:00:00Z&to=2026-10-10T00:00:00Z`],
    ["range too long", `/activities?bbox=${DOWNTOWN_BBOX}&from=2026-10-10T00:00:00Z&to=2026-10-20T00:00:00Z`],
    ["bad kind", `/activities?bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z&kind=admin`],
    ["limit too big", `/activities?bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z&limit=100000`],
    ["unknown param", `/activities?bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z&select=*`],
    ["duplicate param", `/activities?bbox=${DOWNTOWN_BBOX}&bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z`],
    ["bad date", `/activities?bbox=${DOWNTOWN_BBOX}&to=tomorrow`],
  ])("rejects malicious/invalid query: %s", async (_name, path) => {
    const res = await call(path);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_query");
  });

  it("rejects bad ids and non-GET methods (no write surface)", async () => {
    expect((await call("/activities/..%2F..%2Fetc")).status).toBe(400);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect((await call("/activities", { method })).status).toBe(405);
    }
  });

  it("hides backend errors behind a 503 without internals", async () => {
    const failing: OccurrenceRepo = {
      list: async () => {
        throw new Error("password=hunter2 connection refused");
      },
      get: async () => null,
      ping: async () => {
        throw new Error("down");
      },
    };
    const res = await handle(new Request(`${BASE}/healthz`), failing);
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("down");
    const res2 = await handle(new Request(`${BASE}/activities?bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z`), failing, () => NOW);
    expect(await res2.text()).not.toContain("hunter2");
  });

  it("query parser defaults 'from' to now", () => {
    const r = parseActivitiesQuery(new URLSearchParams(`bbox=${DOWNTOWN_BBOX}&to=2026-10-11T00:00:00Z`), NOW);
    expect(r.ok && r.value.from).toBe(NOW.toISOString());
  });
});
