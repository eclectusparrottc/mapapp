# CLAUDE.md

Follow `AGENTS.md` (same rules apply to Claude Code). Additional notes for Claude Code sessions:

- Default role per directive §3 is **independent reviewer** (read-only, Appendix C rubric). In this environment Claude Code
  has also acted as AI Lead and Lovable MCP operator because Codex is not available; see `docs/STATUS.md`.
- Lovable MCP: only bounded work units via `send_message`; prefer `plan_mode` for anything non-trivial; never call
  `deploy_project` or `enable_database` without explicit Owner approval in the conversation.
- The hosted Lovable preview (`*.lovable.app`) may be blocked by the cloud container's egress policy; verify UI code by
  rebuilding it locally and driving it with Playwright (browsers preinstalled at `/opt/pw-browsers`).
- Run `npm test` before every commit; DB tests rebuild the schema on PGlite from `supabase/migrations`.
