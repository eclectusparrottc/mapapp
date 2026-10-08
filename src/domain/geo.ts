import type { LatLng } from "./types";

/**
 * Travel estimates (ADR-006): straight-line distance × detour factor at a conservative
 * walking speed, plus a fixed per-leg overhead. These are labeled "estimate" everywhere
 * and must never be presented as routed travel time.
 */
export const WALK = {
  speedMetersPerMinute: 75, // 4.5 km/h, conservative
  detourFactor: 1.3, // straight line -> street grid
  legOverheadMinutes: 3, // crossings, finding the entrance
} as const;

/** Service area for Phase 1 sanity checks: Metro Vancouver bounding box. */
export const METRO_VANCOUVER_BBOX = { minLat: 49.0, maxLat: 49.45, minLng: -123.35, maxLng: -122.4 } as const;

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated walking minutes, rounded up. 0 m still costs the leg overhead. */
export function walkMinutesEstimate(a: LatLng, b: LatLng): number {
  const meters = haversineMeters(a, b) * WALK.detourFactor;
  return Math.ceil(meters / WALK.speedMetersPerMinute + WALK.legOverheadMinutes);
}

export function isInServiceArea(p: { lat: number | null; lng: number | null }): p is LatLng {
  if (p.lat === null || p.lng === null || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  const b = METRO_VANCOUVER_BBOX;
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}
