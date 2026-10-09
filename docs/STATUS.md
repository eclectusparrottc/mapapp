# CityGap Phase 1 — STATUS (checkpoint report)

_Last updated: 2026-10-09. Statuses: NOT_STARTED · IN_PROGRESS · BLOCKED · IN_REVIEW · ACCEPTED · DEFERRED._
_Nothing is ACCEPTED until the Owner accepts it with evidence._

## 1. Current milestone
Gates G0–G2 are being worked in parallel with the G3/G5 *code*. Each claim below lists the evidence behind it.

| Gate | Status | Evidence / gap |
|---|---|---|
| G0 Segment + env report | IN_REVIEW | `docs/SEGMENT_ANALYSIS.md` (Beachhead A, 3.60, hypothesis); `docs/PREFLIGHT.md` (real MCP calls) |
| G1 Lovable UI + Git Sync + CI | BLOCKED (partly) | Lovable project exists and has built. Core-repo CI is green (run 3+). Lovable GitHub Git Sync needs the Owner (CG-004). The preview URL is unreachable from the agent (egress 403). |
| G2 Demo map + both paths | IN_PROGRESS | Independent review of `fdbe86c`: **FAIL**, no P0 issues. The causes were lint (182 prettier errors), map never verified because tiles are blocked, missing drawer actions, and P1 logic bugs. Fix unit CG-011 + ADR-009 was sent to Lovable on 2026-10-09 and is being built now. |
| G3 Supabase + API + CSV | IN_REVIEW (code) / BLOCKED (project) | Migration + RLS + API + CSV import are tested on Postgres (PGlite) as a non-superuser owner. Owner Supabase project `citygap-dev` does not exist yet. |
| G4 Licensed real source | BLOCKED | No license or terms accepted (Ticketmaster: not applied). Only the demo and CSV paths exist. |
| G5 Feasibility + Top 3 | IN_REVIEW (core) / IN_PROGRESS (UI) | 18 golden cases plus ranking, DB, API and adapter tests: 78 tests passing. The UI port of the core is in progress (CG-011). |
| G6 Review + publish | NOT_STARTED | Publishing requires explicit Owner approval. |

## 2. Real resources
- Lovable project `b457e132-897e-4a81-81ac-cd8ca1fa263a` (workspace "LEAP A.I Industries Ltd.", Pro)
  - editor: https://lovable.dev/projects/b457e132-897e-4a81-81ac-cd8ca1fa263a
  - preview: https://id-preview--b457e132-897e-4a81-81ac-cd8ca1fa263a.lovable.app (**NOT PUBLISHED**)
- Core repo: https://github.com/eclectusparrottc/mapapp, branch `claude/task-planning-goals-1ptphj`
- Lovable credits spent so far (reported by Lovable): 9.9 (initial build) + 1 (plan) + CG-011 build (pending)
- Published URL: none.

## 3. Open issues (who can unblock · minimal step)
| Issue | Impact | Who | Step |
|---|---|---|---|
| Lovable Git Sync not connected | No UI repo/PR/CI for UI (G1) | Owner | Lovable → Settings → Git → GitHub → connect, new **private** repo |
| No Supabase project | G3 cannot be closed on real infra | Owner | Create `citygap-dev`; Lovable → Integrations → Supabase (do **not** enable Lovable Cloud) |
| `*.lovable.app` / tiles blocked for agent | Hosted preview & map tiles unverifiable by agent | Owner | Allow `*.lovable.app`, `tiles.openfreemap.org` in environment Network access, or verify on a phone |
| Tile provider for public demo | ADR-003 | Owner | Accept OpenFreeMap terms or create a MapTiler account |
| Two-repo split | ADR-008 | Owner | Approve option (b) after Git Sync exists |
| BC permanent UTC-7 | Times would be 1 h off on stale browsers | — (fixed in core, being ported) | — |

## 4. Next unblocked work
1. Verify CG-011 output: rebuild locally, Playwright at 360/390/1280, Appendix C review.
2. A further Lovable fix unit if the review finds issues.
3. Release report draft (Appendix D) with `NOT YET PUBLISHED`.

## 5. Change requests / positioning
- ADR-009 changes the UX only, not the positioning: the app opens on a map, but only shows what fits the selected time. The Owner suggested it on 2026-10-09.
- ADR-008, the two-repo split, is **Proposed** and waiting on the Owner.
- Beachhead is unchanged (A).
