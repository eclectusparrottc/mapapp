# ADR-008: Two-repo split: core/backend (`mapapp`) plus a Lovable UI repo

**Status:** Proposed. **Owner decision needed (Change Request).** It deviates from the "one repo" rule in §4.1 and
ADR-001.
**Date:** 2026-10-08 · **Directive refs:** §3 (Git Sync constraint), §4.1, §11 ("cross-stack rewrite" escalation)

## Context
- The Owner created `eclectusparrottc/mapapp` before work started, and it was empty. It now holds the
  framework-agnostic core: `src/domain`, `src/engine`, `src/adapters`, `src/demo`, Supabase migrations and the Edge
  Function, tests and golden cases, docs, and CI.
- Lovable **cannot import an existing repository**. When the Owner connects Git Sync, Lovable will create a **new**
  repository for the UI project `b457e132…`.
- So two repositories will exist. That conflicts with "one reviewable front-end repo, no dual front-end repos".
  `mapapp` contains no UI, so this is not a second front end, but the engine code must reach the UI somehow.

## Options
- **(a) Keep the split and vendor the engine.** `mapapp` stays the source of truth for core and backend. A copy of
  `src/` goes into the Lovable repo as `src/lib/citygap-core`, through a Lovable prompt or a PR.
  - Pros: no repository moves.
  - Cons: two copies that can drift. A parity check is needed (the same golden cases run in both repos). Two CI
    setups.
- **(b) Consolidate into the Lovable repo, then archive `mapapp`.** After Git Sync creates the UI repo, one PR moves
  the `mapapp` content into it: `src/lib/citygap-core/`, `supabase/`, `tests/`, `data/`, `docs/`, `scripts/` and the
  CI jobs. `mapapp` then becomes read-only (archived) with a pointer in its README.
  - Pros: one repo and one CI, which matches the directive.
  - Cons: we must check that Lovable's builder tolerates the extra top-level folders and dev dependencies (pglite,
    vitest, tsx). It also needs one coordinated PR while Lovable is not writing to that branch.
- **(c) Git submodule.** Rejected. Lovable Git Sync is not known to handle submodules. **This is unverified**, and we
  will not test it on the live project.

## Decision (recommended)
Option **(b)**, once Git Sync exists:
1. Keep developing in `mapapp` until the UI repo exists.
2. In the meantime, if the UI needs the engine before then, ship it with option (a) as a stopgap, labeled with the
   `mapapp` commit SHA it came from.
3. After consolidation, archive `mapapp`. Only the Owner can archive it.

Nothing moves until the Owner approves this Change Request.

## Consequences
- Until consolidation, the engine logic in the UI must be a verbatim copy, and its source SHA must be recorded.
  Changes to the engine land in `mapapp` first.
- Documentation paths (`docs/ADR/…`) remain valid after the move, because `docs/` moves as one folder.
- Two CI pipelines run for a short period (CG-013 and CG-014).

## Alternatives considered
See options (a) and (c). A further option is to delete `mapapp` and redo everything in Lovable. Rejected: it throws
away tested work and goes through the more expensive Lovable credit path.

## Verification
- Before (b): a test branch in the UI repo shows that the Lovable build and preview still work with the extra
  folders.
- After (b): CI in the UI repo runs `npm test` (17 golden cases, DB/RLS and API tests) and the UI smoke tests. The
  `mapapp` README points to the new repo.
- Owner approval of this ADR is recorded in `docs/STATUS.md`.
