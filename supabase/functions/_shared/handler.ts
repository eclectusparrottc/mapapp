import {
  API_VERSION,
  isValidOccurrenceId,
  parseActivitiesQuery,
  toApiItem,
  type ActivitiesQuery,
  type PublicOccurrenceRow,
} from "./contract.ts";

/** Data access used by the handler. Production: PostgREST with the anon key (RLS enforced). */
export interface OccurrenceRepo {
  list(q: ActivitiesQuery): Promise<PublicOccurrenceRow[]>;
  get(occurrenceId: string): Promise<PublicOccurrenceRow | null>;
  ping(): Promise<void>;
}

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "x-content-type-options": "nosniff",
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}

/**
 * Read-only router. Path is matched on its suffix so it works behind
 * /functions/v1/activities-api/... as well as a rewritten /api/v1/....
 * There is intentionally no write route; imports run server-side via scripts/import-csv.ts.
 */
export async function handle(req: Request, repo: OccurrenceRepo, now: () => Date = () => new Date()): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
  if (req.method !== "GET") return json(405, { error: "method_not_allowed" }, { allow: "GET, OPTIONS" });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  try {
    if (path.endsWith("/healthz")) {
      await repo.ping();
      return json(200, { ok: true, version: API_VERSION, time: now().toISOString() });
    }

    const detail = /\/activities\/([^/]+)$/.exec(path);
    if (detail) {
      const id = decodeURIComponent(detail[1]!);
      if (!isValidOccurrenceId(id)) return json(400, { error: "invalid_id" });
      const row = await repo.get(id);
      if (!row) return json(404, { error: "not_found" });
      return json(200, { version: API_VERSION, item: toApiItem(row) }, { "cache-control": "public, max-age=60" });
    }

    if (path.endsWith("/activities")) {
      const parsed = parseActivitiesQuery(url.searchParams, now());
      if (!parsed.ok) return json(400, { error: "invalid_query", details: parsed.errors });
      const rows = await repo.list(parsed.value);
      return json(
        200,
        {
          version: API_VERSION,
          generatedAt: now().toISOString(),
          count: rows.length,
          truncated: rows.length >= parsed.value.limit,
          items: rows.map(toApiItem),
        },
        { "cache-control": "public, max-age=60" },
      );
    }
    return json(404, { error: "not_found" });
  } catch {
    // Never leak internals (SQL, keys, stack) to clients.
    return json(503, { error: "backend_unavailable" });
  }
}
