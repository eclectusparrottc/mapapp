# Preflight — real environment & tool capability report (Task 1 / G0)

Date: 2026-10-08. Every line below was verified by an actual tool call in this session unless marked otherwise.

## Runtime (Claude Code cloud container, Linux)
| Item | Result |
|---|---|
| Node / npm / pnpm / bun | v22.22.0 / 10.9.4 / 10.28.0 / 1.4.2 |
| Node tzdata | 2025b (does **not** know BC permanent UTC-7 → handled in code, see ADR-006) |
| Claude Code CLI | present (`/opt/node22/bin/claude`) |
| Codex CLI | **not present** → Claude Code acts as AI Lead + Lovable operator; independent review by separate Claude subagent |
| Playwright + Chromium | present (`/opt/pw-browsers`) |
| Egress | `*.lovable.app` **blocked (HTTP 403 from egress proxy)** → hosted preview cannot be opened from the container; UI verified by local rebuild instead |

## Lovable MCP (official server, OAuth already granted by Owner)
| Check | Result |
|---|---|
| `get_me` (read-only) | OK — account owner; 2 workspaces: "LEAP A.I Industries Ltd." (Pro, 7 existing projects) and "LEAP A.I " (Free, empty) |
| `list_projects query=CityGap` in both workspaces | none existed → no duplicate created |
| Workspace choice | Owner chose **LEAP A.I Industries Ltd. (Pro)** in this session |
| `create_project` | OK — project `b457e132-897e-4a81-81ac-cd8ca1fa263a` (auto-named "CityTime Connect"), visibility `workspace_edit`, **not published** |
| `set_project_knowledge` | OK — CityGap guardrails stored |
| First build cost | 9.9 credits (reported by Lovable) |
| MCP scope caveat | MCP token can act on the **whole Lovable account** incl. the 7 LEAP projects; this session touched only the CityGap project (discipline, not isolation) |
| GitHub Git Sync | **not available via MCP** → Owner must connect in Lovable UI |
| Lovable Cloud DB | **not enabled** (deliberately; ADR-002) |

## GitHub
| Check | Result |
|---|---|
| Repo `eclectusparrottc/mapapp` | existed, empty, no branches → now holds the core (branch `claude/task-planning-goals-1ptphj`) |
| GitHub Actions | enabled; CI workflow runs on push |
| Lovable-created UI repo | does not exist yet (needs Git Sync) |

## Supabase
No Owner Supabase project connected yet → backend verified locally on Postgres (PGlite) only.

## Owner actions required (exact, minimal)
1. **Lovable → project → Settings → Git → GitHub → Connect**, create a **new private** repo (suggested name `citygap-ui`). Unblocks G1/CG-004.
2. **Create Supabase project `citygap-dev`** (any region near Vancouver, e.g. us-west), then in Lovable **Integrations → Supabase → connect existing project**. Do not enable Lovable Cloud. Unblocks G3/CG-010.
3. (Optional, to let this container open previews) allow `*.lovable.app` and `*.supabase.co` in the cloud environment's Network access settings.
4. Decide on the map tile provider for a public demo (OpenFreeMap is used now; see ADR-003) and the Ticketmaster terms (G4).
5. Rename Lovable project to "CityGap Phase 1" (cosmetic).
