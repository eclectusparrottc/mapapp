// Supabase Edge Function (Deno): public read-only activities API v1.
// Deploy: supabase functions deploy activities-api --no-verify-jwt   (public, read-only, RLS-enforced)
import { handle } from "../_shared/handler.ts";
import { postgrestRepo } from "../_shared/postgrestRepo.ts";

const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
if (!url || !anonKey) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");

const repo = postgrestRepo(url, anonKey);
Deno.serve((req) => handle(req, repo));
