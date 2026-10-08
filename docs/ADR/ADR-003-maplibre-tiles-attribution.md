# ADR-003: MapLibre, tile provider, attribution and list fallback

**Status:** Accepted for development. The tile provider for the public demo is **Proposed: Owner must verify terms**.
**Date:** 2026-10-08 · **Directive refs:** §4.1, P1.1, §7, §8

## Context
The directive asks for MapLibre GL JS with a tile service that allows commercial use (MapTiler is its example). It
requires permanent attribution and a list view that keeps working when the map fails. When Lovable generated the UI
it chose **MapLibre GL + OpenFreeMap** tiles. OpenFreeMap needs no key. It does not appear yet in
`docs/LICENSES_AND_SOURCES.md`.

## Decision
- **Renderer:** MapLibre GL JS. It is open source and has no vendor lock-in.
- **Tiles:**
  - Development and preview: OpenFreeMap, as Lovable generated it.
  - Public demo: OpenFreeMap **only after** the Owner verifies its current terms of use, its fair-use and no-SLA
    position, and its required attribution. Record the result in `LICENSES_AND_SOURCES.md`.
  - The fallback provider is **MapTiler**. It needs an Owner-owned account, a plan choice, and a
    **domain-restricted** public key. That key is the only kind of map key allowed in client code.
  - `tile.openstreetmap.org` stays `NOT_USABLE` for the public demo.
- **Attribution:** the MapLibre attribution control stays visible at all widths: "© OpenStreetMap contributors" plus
  the tile provider's own credit. Pins and controls must not cover it.
- **The list fallback is mandatory.** Results are list-first (Top 3 cards). If the map style or tiles fail to load,
  or WebGL is unavailable, the UI shows the list with a visible notice. Recommendations never depend on the map.
  The engine already returns `use_list_fallback` as a suggestion when the source is unavailable
  (`src/engine/feasibility.ts`).
- **Mobile performance:** cluster markers or cap them to the viewport. Never render every pin. Records with no
  coordinates, or coordinates outside the service area, never get a pin (`isInServiceArea` in `src/domain/geo.ts`).

## Consequences
- The Owner must review OpenFreeMap's terms before Publish (ADR-007). If its terms or availability are unacceptable,
  switching to MapTiler is a configuration change of the style URL and key, done through a Lovable work unit.
- No routing or geocoding provider is used in Phase 1, so no provider terms apply to those yet (ADR-006).

## Alternatives considered
- **MapTiler from day one.** The directive prefers it, but it needs an Owner account and key. This is the fallback.
- **CARTO basemaps.** Their terms for public or commercial use are unknown. Fallback candidate only.
- **Google Maps JS.** Places and display terms restrict mixing data with non-Google maps (§14 link 11), and it adds
  cost. Rejected for Phase 1.
- **Map-only UI.** Rejected. It breaks when tiles fail and goes against "decision aid, not a pin party" (§7).

## Verification
- **MANUAL / NOT YET COVERED by CI:** block tile requests with a Playwright route, then confirm the list still
  renders and the notice is shown. Confirm attribution is visible at 360, 390 and 1280 px. This belongs in the UI
  repo's Playwright smoke test, after Git Sync exists (CG-014).
- **MANUAL:** the Owner signs off on the tile-provider row in `LICENSES_AND_SOURCES.md` before Publish.
