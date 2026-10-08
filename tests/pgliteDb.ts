import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = join(__dirname, "..", "supabase", "migrations");

/**
 * Fresh Postgres with Supabase's client roles and all migrations applied from zero.
 * Migrations run as a NON-superuser, NON-bypassrls owner role (like Supabase's `postgres`), and the
 * connection stays in that role afterwards, so importer writes and SECURITY DEFINER helpers are
 * exercised without superuser privileges. Use asRole() to act as anon/authenticated.
 */
export const OWNER_ROLE = "migration_owner";

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role ${OWNER_ROLE} nologin nosuperuser nobypassrls;
    grant anon, authenticated to ${OWNER_ROLE};
    grant usage, create on schema public to ${OWNER_ROLE};
    grant usage on schema public to anon, authenticated;
    set role ${OWNER_ROLE};
  `);
  for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), "utf8"));
  }
  const who = await db.query<{ u: string; su: boolean }>(
    "select current_user as u, (select rolsuper from pg_roles where rolname = current_user) as su",
  );
  if (who.rows[0]?.u !== OWNER_ROLE || who.rows[0]?.su) throw new Error("migrations must run as non-superuser owner");
  return db;
}

export async function asRole<T>(db: PGlite, role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec(`set role ${OWNER_ROLE}`);
  }
}
