# ADR-009 — Map-first landing, but time-filtered (not a pin dump)

**Status:** Accepted (Owner suggestion 2026-10-08, PM interpretation below; UX change within Phase 1 scope — not a positioning Change Request)
**Date:** 2026-10-08

## Context
The Owner suggested that the app should open directly on a map of nearby activities. The directive (§1.3, §7) requires
that the front end must not degrade into "a generic events map stuffed with pins" and that results are Top-3 cards first.
Both goals are compatible if the map *only ever shows what fits a time window*.

## Decision
1. **Landing = live map** centered on a clearly labeled sample start ("Downtown Vancouver (sample start)"; one-tap optional
   one-time location, deniable). No form before value.
2. **Default lens = "Fits in the next 60 min"** (free-time mode, walking). Only engine-approved results are pinned; Top 3 are
   numbered and highlighted; others are small dots; nothing that fails feasibility is pinned. Max ~15 pins (viewport-capped).
3. **Bottom sheet** (mobile) / side panel (desktop) holds: time chips 30/60/90/120, the primary CTA **"Before my next plan"**
   (sets destination + start time → map re-filters and shows "leave by" lines), Top-3 cards, and a list toggle.
4. Pin styling encodes confidence: solid = schedule known; dashed/hollow = estimated only; never a green "available" pin unless
   `confirmed_from_authorized_source`.
5. Map failure → the same sheet expands to a full list (no dead end). Attribution always visible.
6. Headline copy stays: "Make the time before your next plan count." shown in the sheet header.

## Consequences
+ Value visible in ~3 s with zero input; supports Experiment B (map-first time-filtered vs generic nearby list).
+ Keeps the differentiator: every pin answers "fits my time?", not "exists nearby?".
− "Before my next plan" moves from a hero button to the sheet's primary button; must remain the most prominent control.
− Requires the engine to run on landing (cheap: deterministic, client-side on demo data).

## Verification
Playwright: landing renders map or list fallback within 3 s at 360/390/1280; ≤3 highlighted pins; no pin for a rejected record
(cancelled/full/too far); CTA "Before my next plan" reachable by keyboard; DEMO label visible.
