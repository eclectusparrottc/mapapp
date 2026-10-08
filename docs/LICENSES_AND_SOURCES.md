# CityGap Phase 1 — Licenses & Data Sources Registry

- **Version:** 0.1 (2026-10-08)
- **Source:** Founder Directive v1.0, sections 4.1, 6 (P1.3) and 8
- **Owner of registry:** PM / Data workstream. **Only the Owner may accept third-party terms.**

> This file is the **data source registry (数据源登记簿)**. Treat every source as **not usable for public display** until it reaches `APPROVED`.
> - `UNKNOWN — Owner to verify` means we have not confirmed the fact. It does **not** mean the use is allowed.
> - No term in this file has been accepted by the Owner as of 2026-10-08.
> - Records from any source whose `data_permission_status = unverified` must not enter the public verified data set.
> - Links were listed on 2026-10-08 from the founder directive or from general knowledge of where each provider publishes its terms. **They have not been fetched or reviewed in this pass.** Re-open them before any decision.

## Status vocabulary

| Status | Meaning |
|---|---|
| `IN_USE_SYNTHETIC` | Our own synthetic records. No third-party rights involved |
| `ADAPTER_BUILT_NO_DATA` | Code path exists. No real records loaded |
| `NOT_APPLIED` | No account, key or application made |
| `NOT_USABLE` | Known not to support our use case |
| `UNDER_REVIEW` | Terms being reviewed by the Owner |
| `APPROVED` | Owner has accepted terms in writing. The scope is recorded here |
| `REJECTED` | Owner decided not to use it |

## 1. Activity and event data sources

| Source | Docs link | Authorization basis | Allowed use | Cache / redisplay / deletion terms | Expiry | Contact | Status |
|---|---|---|---|---|---|---|---|
| **Synthetic demo data** (CityGap-generated, 30–50 records) | Internal (repo fixtures, path TBD) | Created by the project. No third-party rights | Dev, demo, tests, Experiment C. **Must show the DEMO DATA label.** Never presented as real events or real availability | No restrictions. Coordinates are geographically plausible test points only | N/A | PM / Data workstream | `IN_USE_SYNTHETIC` |
| **Curated CSV** (manually assembled records) | Internal: CSV schema and validation in the adapter README (path TBD) | Each row needs its own basis: an organiser or venue partner's written permission, or facts the Owner has confirmed may be listed (name, time, location, link back). **Basis per row: UNKNOWN — Owner to verify** | Only rows whose `data_permission_status` is verified may be shown publicly. Link back to the source URL. No copying of long copyrighted descriptions, images or reviews | Per partner agreement. **UNKNOWN — Owner to verify** | Per row (`expires_at`) | Owner (per partner) | `ADAPTER_BUILT_NO_DATA` — no real records yet |
| **Ticketmaster Discovery API** | API: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/ · Terms: https://developer.ticketmaster.com/support/terms-of-use/ | API key under the Ticketmaster developer terms. **Commercial redisplay rights: UNKNOWN — Owner to verify** | Candidate first real provider (directive P1.3). Server-side calls only. Key never in the browser. **Allowed use: UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** (caching duration, attribution, required deletion, image use) | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_APPLIED` — terms need Owner review before application |
| **Eventbrite** | https://www.eventbrite.ca/platform/new/api | Platform API token (organiser- or account-scoped) | The **public Event Search API was discontinued in 2019** (per directive section 14). A normal token is **not** city-wide search. Possible future use: only events of organisers who explicitly authorise us. **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_USABLE` as a city-wide source. No scraping or login bypass |
| **Luma** | https://docs.lu.ma/ (link to be confirmed current) | **No unrestricted general API assumed.** Any API access is believed to be scoped to calendars the account owns or manages. **UNKNOWN — Owner to verify** | Possibly an organiser-partner calendar, if a partner grants access. **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_APPLIED`. No scraping |
| **CatchCorner** (sports facility booking) | https://www.catchcorner.com (no public developer docs located; not searched) | **No general API assumed.** Would require a direct partnership. **UNKNOWN — Owner to verify** | Real-time facility inventory is **deferred to Phase 2** (directive). **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_APPLIED`. No scraping, login bypass or private API use |
| **AllEvents** (aggregator) | https://allevents.in (developer or licensing page not located; not searched) | **Coverage, data licence and cost all UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify**. An aggregator's licence must cover *upstream* rights too | **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_APPLIED` |

## 2. Map, place and geo sources

| Source | Docs link | Authorization basis | Allowed use | Cache / redisplay / deletion terms | Expiry | Contact | Status |
|---|---|---|---|---|---|---|---|
| **OpenStreetMap data** (underlying map data in most OSM-based tiles) | https://www.openstreetmap.org/copyright | ODbL licence. Attribution "© OpenStreetMap contributors" is required | Displayed through a tile provider. Attribution must always stay visible (directive section 8) | Per ODbL. **Details: Owner to verify** if we ever store or derive OSM data | N/A | N/A | Required attribution, whichever tile provider is chosen |
| **tile.openstreetmap.org** (OSMF public tile servers) | https://operations.osmfoundation.org/policies/tiles/ | OSMF Tile Usage Policy | The policy **forbids heavy use and is not meant for commercial or production apps.** At most, light local development. **Do not use for the public demo** | Per policy (no bulk download or prefetch; a valid User-Agent and attribution are required). Owner to verify current text | N/A | OSMF | `NOT_USABLE` for the public demo |
| **OpenFreeMap** (currently used by the Lovable UI, key-less vector tiles) | https://openfreemap.org/ (terms page: to be confirmed current) | Public free service built on OpenStreetMap data; no account. Commercial use and fair-use limits: **UNKNOWN — Owner to verify** | MapLibre GL basemap. OSM + OpenFreeMap attribution must stay visible | No SLA assumed; the UI must fall back to the list if tiles fail | — | none (public service) | `IN_USE_PREVIEW_ONLY` — approved for preview/dev; **Owner decision required before public Publish** (ADR-003) |
| **MapTiler** (directive's preferred example for MapLibre tiles) | https://www.maptiler.com/terms/ (link to be confirmed current) | Requires an **API key and an Owner-owned account**. Plan tier and commercial terms: **UNKNOWN — Owner to verify** | MapLibre GL JS basemap. Attribution for MapTiler and OSM must stay visible. The key must be domain-restricted. No production secrets in client code beyond a restricted public key | **UNKNOWN — Owner to verify** | Per plan | Owner account | `NOT_APPLIED` — Owner must create the account and choose a plan |
| **CARTO basemaps** | https://carto.com/legal/ (link to be confirmed current) | CARTO's own basemap terms, separate from OSM. **Whether commercial or public-demo use is allowed: UNKNOWN — Owner to verify** | Fallback candidate only, if its terms permit it | **UNKNOWN — Owner to verify** | **UNKNOWN — Owner to verify** | UNKNOWN — Owner to verify | `NOT_APPLIED` |
| **Google Places API** | https://developers.google.com/maps/documentation/places/web-service/policies | Google Maps Platform terms. Requires a billing account (Owner) | **Display and caching restrictions apply**, especially when showing Places data on a non-Google map. Attribution requirements apply. **Specific allowed use: UNKNOWN — Owner to verify** | Restricted caching and storage of Places content (except as the policy permits). **Owner to verify current policy** | **UNKNOWN — Owner to verify** | Owner account | `NOT_APPLIED`. Not planned for Phase 1 |
| **Routing / travel time** | N/A | Not used | Phase 1 uses a straight-line distance × conservative walking pace estimate, always labelled **estimate**. A Matrix API for the Top-N is a Phase 2 option | N/A | N/A | N/A | Not used in Phase 1 |
| **Geocoding / address search** | N/A | Not used | Phase 1 uses fixed test-venue shortcuts and manual sample start points. Geocoding is a future adapter and needs its own registry row | N/A | N/A | N/A | Not used in Phase 1 |

## 3. Process for moving a source to `APPROVED`

1. The PM / Data workstream fills every column with links to the exact term sections.
2. The Owner reviews and accepts the terms (directive section 3: only the Owner accepts third-party terms). The decision and its date are recorded here.
3. Credentials are stored server-side only (Supabase secrets). Never in the repo or the client bundle.
4. The adapter records `data_permission_status`, `source_url`, `last_seen_at` and the deletion and expiry handling.
5. `real-data ready` is reported separately from `demo ready` in the Gate Report.

## 4. Change log

| Date | Change | By |
|---|---|---|
| 2026-10-08 | Initial registry. No source approved. Only synthetic data in use | PM workstream (AI) |
