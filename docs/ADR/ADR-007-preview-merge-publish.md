# ADR-007: Preview, merge and publish are separate permissions and actions, with rollback

**Status:** Accepted
**Date:** 2026-10-08 · **Directive refs:** §4.1, M0-C, P1.5, §10 (Stop & Escalate)

## Context
Lovable has three separate things that are easy to confuse:
- the **Preview**, which rebuilds after every agent edit;
- **GitHub sync and merge**, which records the code;
- **Publish**, which makes the public URL a snapshot.

A merged commit does **not** update the published site. A Lovable edit does **not** go through PR review. The
Lovable MCP token can call `deploy_project` for the whole account.

## Decision

| Action | Who may do it | Gate |
|---|---|---|
| Lovable edit → Preview | AI Lead via MCP `send_message` (bounded work unit) | none. The Preview is not a release. |
| GitHub PR merge into `main` | Owner, or AI Lead after CI is green and the review is done | CI green and reviewer findings resolved. UI and business acceptance by the Owner. |
| Lovable **Publish** (`deploy_project`) | **Owner approval only**, given explicitly in the conversation | P1.5 checklist complete. Only demo data with no PII and no unauthorized real data. |
| Supabase migration push / Edge Function deploy | AI Lead to `citygap-dev` after the Owner provisions it | Destructive changes need Owner approval. |

- Work happens on feature branches (`feature/lovable-<ticket>` for Lovable, `feature/<ticket>` for core). One writer
  per branch.
- If Lovable creates a `lovable-sync` conflict branch, **stop and inspect the diff**. Never force-push over it.
- **Every Publish is recorded** in `docs/STATUS.md` and the release notes, with:
  - the Git commit SHA and the Lovable `latest_commit_sha`;
  - project ID `b457e132-897e-4a81-81ac-cd8ca1fa263a`;
  - the published URL and the date;
  - the Supabase project alias;
  - known limitations and data authorization status.
- **Rollback:** restore the previous version from Lovable's version history and re-publish it. Record which version
  was restored. Revert the GitHub commit if needed. Backend rollback means redeploying the previous Edge Function
  version. Schema changes roll forward only (a new migration, never an edit to an old one).
- Until the published URL has been opened in a real browser and a full path completed, the status stays
  `NOT YET PUBLISHED`, never `LIVE`.

## Consequences
- Current state: **not published.** No `deploy_project` call has been made.
- Preview evidence is limited: the agent container cannot reach `*.lovable.app` (egress 403). UI checks are done by
  rebuilding the Lovable code locally and driving it with Playwright, plus checks by the Owner on a real phone.
- Lovable edits made before Git Sync exists have no PR review trail. Only Lovable's version history records them.

## Alternatives considered
- **Auto-publish on merge.** That is not how Lovable works, and it would bypass Owner approval.
- **A separate Vercel deploy from GitHub.** Deferred to a possible Phase 2 ADR (§4.2).

## Verification
- **MANUAL:** a release report (template: directive Appendix D) with the SHA, URL, date and rollback steps.
- **MANUAL:** after Publish, open the permanent URL on a phone and complete the "Before my next plan" path.
- **MANUAL:** the Lovable MCP call log shows no `deploy_project` call without a matching Owner approval message.
