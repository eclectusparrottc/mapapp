import type { ActivitiesQuery, PublicOccurrenceRow } from "./contract.ts";
import type { OccurrenceRepo } from "./handler.ts";

/** Reads the RLS-protected view with the PUBLIC anon key. Never use the service-role key here. */
export function postgrestRepo(baseUrl: string, anonKey: string, timeoutMs = 5000): OccurrenceRepo {
  const headers = { apikey: anonKey, authorization: `Bearer ${anonKey}`, accept: "application/json" };
  const get = async (qs: URLSearchParams): Promise<PublicOccurrenceRow[]> => {
    const res = await fetch(`${baseUrl}/rest/v1/public_occurrences_v1?${qs}`, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`postgrest ${res.status}`);
    return (await res.json()) as PublicOccurrenceRow[];
  };
  return {
    async list(q: ActivitiesQuery) {
      const qs = new URLSearchParams();
      qs.set("select", "*");
      qs.append("lat", `gte.${q.bbox.minLat}`);
      qs.append("lat", `lte.${q.bbox.maxLat}`);
      qs.append("lng", `gte.${q.bbox.minLng}`);
      qs.append("lng", `lte.${q.bbox.maxLng}`);
      qs.set(
        "and",
        `(or(starts_at_utc.lt.${q.to},starts_at_utc.is.null),or(ends_at_utc.gt.${q.from},ends_at_utc.is.null))`,
      );
      if (q.kinds.length) qs.set("kind", `in.(${q.kinds.join(",")})`);
      if (q.categories.length) qs.set("categories", `ov.{${q.categories.join(",")}}`);
      qs.set("order", "starts_at_utc.asc.nullsfirst,occurrence_id.asc");
      qs.set("limit", String(q.limit));
      return get(qs);
    },
    async get(id: string) {
      const qs = new URLSearchParams({ select: "*", occurrence_id: `eq.${id}`, limit: "1" });
      return (await get(qs))[0] ?? null;
    },
    async ping() {
      await get(new URLSearchParams({ select: "occurrence_id", limit: "1" }));
    },
  };
}
