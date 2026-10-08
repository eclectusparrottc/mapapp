/**
 * Curated CSV import CLI (server-side only).
 *   npm run import:csv -- --file data/samples/curated_sample.csv --source curated-csv            # dry run (default)
 *   ... --now 2026-10-10T12:00:00Z    # evaluate expiry against a fixed instant (reproducible CI runs)
 *   DATABASE_URL=... npm run import:csv -- --file my.csv --source curated-csv --apply            # write to Postgres
 * DATABASE_URL must point at the Owner's dev Supabase Postgres (service connection). Never run against production
 * without Owner approval. Prints the sync report as JSON; exit code 1 if the run failed.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { csvAdapter } from "../src/adapters/csv";
import { PgStore } from "../src/adapters/pgStore";
import { InMemoryStore, runSync } from "../src/adapters/sync";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    source: { type: "string", default: "curated-csv" },
    apply: { type: "boolean", default: false },
    now: { type: "string" },
  },
});
if (!values.file) {
  console.error("usage: import-csv --file <path.csv> [--source name] [--apply]");
  process.exit(2);
}

const adapter = csvAdapter(values.source!, () => readFile(values.file!, "utf8"));

let report;
if (values.apply) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("--apply requires DATABASE_URL (server-side only). Aborting; nothing written.");
    process.exit(2);
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    report = await runSync(adapter, new PgStore(client), { now: values.now });
  } finally {
    await client.end();
  }
} else {
  report = await runSync(adapter, new InMemoryStore(), { dryRun: true, now: values.now });
}

console.log(JSON.stringify({ mode: values.apply ? "apply" : "dry-run", ...report }, null, 2));
process.exit(report.run.status === "failed" ? 1 : 0);
