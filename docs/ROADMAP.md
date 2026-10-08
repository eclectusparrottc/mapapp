# CityGap Phase 1 — Roadmap (gates G0–G6, directive §11)

Gates are sequential; work inside a gate may run in parallel. A gate is passed only with evidence listed in `docs/STATUS.md`.

| Gate | Outcome | Depends on | Owner action needed | Exit evidence |
|---|---|---|---|---|
| **G0** | Segment analysis + real environment/tool report | directive | — (done via existing OAuth) | `docs/SEGMENT_ANALYSIS.md`, `docs/STATUS.md` §Preflight, Lovable MCP read-only + write calls verified |
| **G1** | Lovable UI running + GitHub Git Sync repo + CI | G0 | **Connect GitHub in Lovable (Project settings → Git → GitHub), choose private repo** | Preview opened in a browser, Lovable-created repo exists, CI green on both repos |
| **G2** | Demo map + both time paths + 30–50 synthetic records | G1 | Visual acceptance on a real phone | 360/390/1280 screenshots, empty/error/DEMO states, list fallback when tiles fail |
| **G3** | Owner Supabase + schema + read-only API + CSV import | G2 | **Create Supabase project `citygap-dev`, connect it in Lovable (Integrations → Supabase), provide DATABASE_URL to the importer runner** | Migration applied from zero, RLS tests, API smoke against the real project, CSV import twice = no dupes |
| **G4** | One licensed real-data adapter | G3 + license | **Accept/apply for Ticketmaster Discovery API (or other) terms; store key as Supabase secret** | Real-source smoke test; otherwise stays BLOCKED (demo unaffected) |
| **G5** | Feasibility-Lite + Top 3 + share/links in the UI | G3 (demo data OK) | Experience acceptance | Golden cases green, UI uses the tested engine, mobile main path passes |
| **G6** | Independent review, fixes, public demo | G1–G5 | **Explicit approval to Publish** | Live URL opened and a full path verified; release report |

## Sequencing actually used
1. G0 + P1.0 docs (parallel) → 2. Lovable project created via MCP (G1 UI part) → 3. engine/schema/adapter/tests built in this repo in parallel
(G3/G5 *code*, no Supabase yet) → 4. local rebuild + Playwright verification of Lovable code (G2 evidence) →
5. port tested engine into the Lovable UI (G5) → 6. Owner connects GitHub + Supabase → G1/G3 closed → 7. review + publish request (G6).
