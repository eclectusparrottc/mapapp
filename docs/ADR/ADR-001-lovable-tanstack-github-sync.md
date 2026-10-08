# ADR-001: Lovable new project + TanStack Start + GitHub Git Sync

**Status:** Accepted (UI project exists). GitHub Git Sync: **BLOCKED, Owner action needed**.
**Date:** 2026-10-08 · **Directive refs:** §3, §4.1, §4.2, M0-C, §12

## Context
The directive puts the UI in Lovable, which owns the front-end stack and the hosting. We should not start a separate
Next.js/Vercel front end. Lovable Git Sync can only **create a new** GitHub repository from a Lovable project. It
cannot import an existing repo, and it syncs one active branch at a time (directive §3, §14 link 2).

What actually exists (checked through Lovable MCP from Claude Code on 2026-10-08):

| Item | Value |
|---|---|
| Lovable project | "CityTime Connect" (to be renamed CityGap, backlog CG-017) |
| Project ID | `b457e132-897e-4a81-81ac-cd8ca1fa263a` |
| Workspace | "LEAP A.I Industries Ltd." (Pro) |
| Created | 2026-10-08 via Lovable MCP `create_project` |
| Stack (as generated) | TanStack Start/Router, React, TypeScript, Tailwind, shadcn/ui, bun |
| Map | MapLibre GL + OpenFreeMap tiles (see ADR-003) |
| Lovable Cloud DB | **Not enabled** (see ADR-002) |
| Published | **No** (`NOT YET PUBLISHED`) |
| Git Sync | **Not connected**. This needs an Owner/admin in the Lovable UI (Project settings → Git → GitHub) |
| Preview URL | https://id-preview--b457e132-897e-4a81-81ac-cd8ca1fa263a.lovable.app (the agent container cannot reach it: egress policy returns 403) |

## Decision
1. The UI is built only in this Lovable project, on the stack Lovable generated (TanStack Start). We keep that stack
   and do not add a Next.js/Vercel front end.
2. After the Owner connects Git Sync, the repository Lovable creates is the **only** front-end repository.
3. We change the UI through small Lovable MCP `send_message` work units, using `plan_mode` for anything that is not
   trivial. We do not use `/goal` runs without a written scope and a credit check.
4. The framework-agnostic core (domain, engine, adapters, Supabase) currently lives in `eclectusparrottc/mapapp`.
   ADR-008 covers how that second repo is reconciled with this decision.

## Consequences
- No second front end, no second deploy channel. Phase 1 publishing goes through Lovable only (ADR-007).
- G1 cannot close until Git Sync exists. Until then, Lovable's version history is the only record of UI history.
- The UI repo has no CI yet (CG-014 is blocked on CG-004).
- **Role deviation:** Codex is not available in this environment, so Claude Code acted as AI Lead and Lovable MCP
  operator. A separate Claude subagent did the independent review. The directive's separation of duties (§3) is
  therefore only approximated: the reviewer is the same model, run in a separate context.

## Alternatives considered
- **Next.js on Vercel next to Lovable.** Rejected by the directive (§4.2): it means two routing and deploy paradigms.
- **Point Lovable at the existing `mapapp` repo.** Not possible: Lovable cannot import an existing repo.
- **Build the UI outside Lovable.** Rejected. Lovable is the designated UX implementer.

## Verification
- Lovable MCP `get_project` returns the ID above. Its `latest_commit_sha` can be compared with the GitHub HEAD once
  Git Sync exists.
- G1 evidence (still pending): the Lovable-created repo is visible, the commit SHA matches, CI has run, and the
  preview has been opened in a real browser.
