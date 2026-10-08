import { addMinutes, localToUtc, localDate, DISPLAY_TZ } from "../domain/time";
import type { ActivityKind, BookingState, CancellationStatus, Candidate, Category, EndTimeQuality, Venue } from "../domain/types";

/**
 * SYNTHETIC DEMO DATA — not real events, venues or availability.
 * Venue names are fictional ("Demo …") and placed at plausible public-space coordinates
 * in two Phase 1 areas: Downtown Vancouver (Rogers Arena / BC Place micro-core) and
 * Richmond City Centre. Templates use local wall-clock times and are materialized for
 * any date so the demo never goes stale. Includes deliberate edge cases.
 */

export const DEMO_SOURCE_NAME = "citygap-demo";

export const SAMPLE_PLACES = {
  downtown_sample_start: { label: "Downtown Vancouver (sample start)", lat: 49.2811, lng: -123.1145 },
  richmond_sample_start: { label: "Richmond City Centre (sample start)", lat: 49.1676, lng: -123.1372 },
  rogers_arena: { label: "Rogers Arena (sample destination)", lat: 49.2778, lng: -123.1089 },
  bc_place: { label: "BC Place (sample destination)", lat: 49.2768, lng: -123.1119 },
  richmond_brighouse: { label: "Richmond–Brighouse Station (sample destination)", lat: 49.1683, lng: -123.1365 },
} as const;

type VenueSeed = Omit<Venue, "timezone">;

export const DEMO_VENUES: Record<string, VenueSeed> = {
  dt_plaza: { id: "demo-v-dt-plaza", name: "Demo Plaza North (near BC Place)", lat: 49.278, lng: -123.1125, address: null },
  dt_seawall: { id: "demo-v-dt-seawall", name: "Demo Seawall Point (False Creek)", lat: 49.2745, lng: -123.1115, address: null },
  dt_gallery: { id: "demo-v-dt-gallery", name: "Demo Gallery Loft (Crosstown)", lat: 49.2803, lng: -123.106, address: null },
  dt_library: { id: "demo-v-dt-library", name: "Demo Library Square Room", lat: 49.2797, lng: -123.1157, address: null },
  dt_chinatown: { id: "demo-v-dt-chinatown", name: "Demo Chinatown Courtyard", lat: 49.2797, lng: -123.1035, address: null },
  dt_gastown: { id: "demo-v-dt-gastown", name: "Demo Gastown Corner", lat: 49.284, lng: -123.1085, address: null },
  dt_yaletown: { id: "demo-v-dt-yaletown", name: "Demo Yaletown Hall", lat: 49.2745, lng: -123.121, address: null },
  dt_science: { id: "demo-v-dt-science", name: "Demo Science Plaza (east False Creek)", lat: 49.2733, lng: -123.104, address: null },
  dt_granville: { id: "demo-v-dt-granville", name: "Demo Granville Strip Studio", lat: 49.28, lng: -123.122, address: null },
  dt_concourse: { id: "demo-v-dt-concourse", name: "Demo Arena-side Café", lat: 49.2772, lng: -123.108, address: null },
  rm_plaza: { id: "demo-v-rm-plaza", name: "Demo Brighouse Plaza", lat: 49.1683, lng: -123.1365, address: null },
  rm_park: { id: "demo-v-rm-park", name: "Demo Park Pavilion (Richmond)", lat: 49.166, lng: -123.143, address: null },
  rm_bites: { id: "demo-v-rm-bites", name: "Demo Night Bites Lot (Richmond)", lat: 49.17, lng: -123.138, address: null },
  rm_studio: { id: "demo-v-rm-studio", name: "Demo City Centre Studio (Richmond)", lat: 49.167, lng: -123.1395, address: null },
  // Deliberately broken venues (edge cases): never shown on the map.
  bad_missing: { id: "demo-v-bad-missing", name: "Demo Pop-up (location TBA)", lat: null, lng: null, address: null },
  bad_zero: { id: "demo-v-bad-zero", name: "Demo Venue With Bad Geocode", lat: 0, lng: 0, address: null },
};

type Days = "all" | "weekdays" | "weekends";

export interface DemoTemplate {
  id: string;
  title: string;
  kind: ActivityKind;
  categories: Category[];
  summary: string;
  durMin: number | null;
  durMax: number | null;
  venue: keyof typeof DEMO_VENUES;
  /** Local start times "HH:MM"; null = drop-in with unknown opening time. */
  starts: Array<string | null>;
  /** Local end "HH:MM" (earlier than start = next day) or null. */
  end: string | null;
  /** Duration-based end instead of fixed clock end (bookable slots). */
  slotMinutes?: number;
  endQuality: EndTimeQuality;
  cancellation?: CancellationStatus;
  booking: BookingState;
  requiresBooking: boolean | null;
  days?: Days;
  /** Edge-case tag for QA / golden cases. */
  edge?: string;
}

export const DEMO_TEMPLATES: DemoTemplate[] = [
  // ---- Downtown: scheduled events (12) ----
  { id: "dt-ev-busk", title: "[DEMO] Plaza Busker Set", kind: "scheduled_event", categories: ["music"], summary: "Short acoustic set on the plaza steps.", durMin: 20, durMax: 45, venue: "dt_plaza", starts: ["12:00", "17:30", "18:30"], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: false, edge: "unknown_end" },
  { id: "dt-ev-talk", title: "[DEMO] Lunchtime Design Talk", kind: "scheduled_event", categories: ["learning", "arts"], summary: "45-minute talk on city design.", durMin: 45, durMax: 45, venue: "dt_library", starts: ["12:15"], end: "13:00", endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true, days: "weekdays" },
  { id: "dt-ev-poetry", title: "[DEMO] Early Evening Poetry Open Mic", kind: "scheduled_event", categories: ["arts"], summary: "Sign-up at the door; readings in 5-minute slots.", durMin: 30, durMax: 90, venue: "dt_gallery", starts: ["18:00"], end: "19:30", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-ev-jazz", title: "[DEMO] Happy-Hour Jazz Trio", kind: "scheduled_event", categories: ["music", "nightlife"], summary: "Two sets; come for one.", durMin: 40, durMax: 90, venue: "dt_yaletown", starts: ["17:00"], end: "18:30", endQuality: "estimated", booking: "sales_open_not_inventory", requiresBooking: null },
  { id: "dt-ev-tour", title: "[DEMO] Chinatown History Mini-Tour", kind: "scheduled_event", categories: ["learning", "outdoors"], summary: "Guided 40-minute walking tour.", durMin: 40, durMax: 40, venue: "dt_chinatown", starts: ["11:00", "16:30", "18:00"], end: null, slotMinutes: 40, endQuality: "known", booking: "unknown", requiresBooking: true },
  { id: "dt-ev-film", title: "[DEMO] Short Film Shorts", kind: "scheduled_event", categories: ["arts"], summary: "Three local shorts, 50 minutes total.", durMin: 50, durMax: 50, venue: "dt_granville", starts: ["17:15", "19:45"], end: null, slotMinutes: 50, endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true },
  { id: "dt-ev-sketch", title: "[DEMO] Seawall Sketch Meetup", kind: "scheduled_event", categories: ["arts", "outdoors"], summary: "Bring a pencil; group sketching session.", durMin: 30, durMax: 60, venue: "dt_seawall", starts: ["17:30"], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: false, days: "weekends", edge: "unknown_end" },
  { id: "dt-ev-trivia", title: "[DEMO] Pre-Game Sports Trivia", kind: "scheduled_event", categories: ["sports", "nightlife"], summary: "Quick-fire trivia before the game.", durMin: 45, durMax: 60, venue: "dt_concourse", starts: ["17:45"], end: "18:45", endQuality: "known", booking: "full", requiresBooking: true, edge: "sold_out" },
  { id: "dt-ev-science", title: "[DEMO] Science Demo Show", kind: "scheduled_event", categories: ["family", "learning"], summary: "Live demo show, all ages.", durMin: 30, durMax: 30, venue: "dt_science", starts: ["13:00", "15:00", "17:00"], end: null, slotMinutes: 30, endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true },
  { id: "dt-ev-cancel", title: "[DEMO] Rooftop Choir (Cancelled)", kind: "scheduled_event", categories: ["music"], summary: "This session was cancelled by the organizer.", durMin: 30, durMax: 30, venue: "dt_gastown", starts: ["18:00"], end: "18:30", endQuality: "known", cancellation: "cancelled", booking: "unavailable", requiresBooking: false, edge: "cancelled" },
  { id: "dt-ev-late", title: "[DEMO] Late Comedy Set", kind: "scheduled_event", categories: ["nightlife"], summary: "Late-night stand-up, crosses midnight.", durMin: 45, durMax: 75, venue: "dt_granville", starts: ["23:45"], end: "01:00", endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true, edge: "cross_midnight" },
  { id: "dt-ev-tba", title: "[DEMO] Pop-up Market (location TBA)", kind: "scheduled_event", categories: ["shopping"], summary: "Location not yet published.", durMin: 30, durMax: 60, venue: "bad_missing", starts: ["16:00"], end: "20:00", endQuality: "known", booking: "unknown", requiresBooking: false, edge: "missing_coordinates" },

  // ---- Downtown: drop-ins (11) ----
  { id: "dt-di-gallery", title: "[DEMO] Crosstown Mini Gallery", kind: "drop_in", categories: ["arts"], summary: "Small rotating exhibition; walk-in.", durMin: 25, durMax: 60, venue: "dt_gallery", starts: ["10:00"], end: "20:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-coffee", title: "[DEMO] Arena-side Espresso Bar", kind: "drop_in", categories: ["food_drink"], summary: "Quick coffee and pastry near the arena.", durMin: 15, durMax: 40, venue: "dt_concourse", starts: ["07:00"], end: "21:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-seawall", title: "[DEMO] Seawall Loop Walk", kind: "drop_in", categories: ["outdoors", "wellness"], summary: "Self-guided 2 km loop with water views.", durMin: 30, durMax: 45, venue: "dt_seawall", starts: [null], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: false, edge: "always_open_unknown_hours" },
  { id: "dt-di-garden", title: "[DEMO] Courtyard Garden", kind: "drop_in", categories: ["outdoors", "wellness"], summary: "Quiet courtyard garden.", durMin: 20, durMax: 45, venue: "dt_chinatown", starts: ["10:00"], end: "18:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-dumpling", title: "[DEMO] Dumpling Counter", kind: "drop_in", categories: ["food_drink"], summary: "Counter seating; queue length unknown.", durMin: 25, durMax: 50, venue: "dt_chinatown", starts: ["11:30"], end: "21:30", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-records", title: "[DEMO] Corner Record Shop", kind: "drop_in", categories: ["music", "shopping"], summary: "Browse vinyl and local releases.", durMin: 15, durMax: 45, venue: "dt_gastown", starts: ["11:00"], end: "19:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-reading", title: "[DEMO] Library Reading Lounge", kind: "drop_in", categories: ["learning", "wellness"], summary: "Free seating and magazines.", durMin: 20, durMax: 90, venue: "dt_library", starts: ["09:30"], end: "20:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-arcade", title: "[DEMO] Retro Arcade Room", kind: "drop_in", categories: ["nightlife", "family"], summary: "Pay-per-play arcade cabinets.", durMin: 20, durMax: 60, venue: "dt_yaletown", starts: ["12:00"], end: "23:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "dt-di-ramen", title: "[DEMO] Granville Ramen Bar", kind: "drop_in", categories: ["food_drink"], summary: "Hours vary; closing time not published.", durMin: 30, durMax: 50, venue: "dt_granville", starts: ["11:30"], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: false, edge: "closing_unknown" },
  { id: "dt-di-science", title: "[DEMO] Science Plaza Outdoor Exhibits", kind: "drop_in", categories: ["family", "learning", "outdoors"], summary: "Outdoor interactive exhibits.", durMin: null, durMax: null, venue: "dt_science", starts: ["10:00"], end: "17:00", endQuality: "known", booking: "unknown", requiresBooking: false, edge: "duration_unknown" },
  { id: "dt-di-badgeo", title: "[DEMO] Mural Spot (bad geocode)", kind: "drop_in", categories: ["arts"], summary: "Record with an invalid 0,0 coordinate.", durMin: 10, durMax: 20, venue: "bad_zero", starts: [null], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: false, edge: "invalid_coordinates" },

  // ---- Downtown: bookable slots with unknown inventory (5) ----
  { id: "dt-bs-climb", title: "[DEMO] Climbing Wall Taster", kind: "bookable_slot", categories: ["sports", "wellness"], summary: "45-min intro slot; capacity not verified.", durMin: 45, durMax: 45, venue: "dt_yaletown", starts: ["16:00", "17:00", "18:00", "19:00"], end: null, slotMinutes: 45, endQuality: "known", booking: "unknown", requiresBooking: true },
  { id: "dt-bs-pottery", title: "[DEMO] Pottery Wheel Drop-in Slot", kind: "bookable_slot", categories: ["arts"], summary: "60-min wheel slot.", durMin: 60, durMax: 60, venue: "dt_gallery", starts: ["14:00", "17:00"], end: null, slotMinutes: 60, endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true },
  { id: "dt-bs-pingpong", title: "[DEMO] Ping-Pong Table Rental", kind: "bookable_slot", categories: ["sports"], summary: "30-min table rental.", durMin: 30, durMax: 30, venue: "dt_plaza", starts: ["16:30", "17:00", "17:30", "18:00", "18:30"], end: null, slotMinutes: 30, endQuality: "known", booking: "unknown", requiresBooking: true },
  { id: "dt-bs-vr", title: "[DEMO] VR Booth Session", kind: "bookable_slot", categories: ["family", "nightlife"], summary: "20-min VR session.", durMin: 20, durMax: 20, venue: "dt_gastown", starts: ["17:00", "17:30", "18:00", "18:30", "19:00"], end: null, slotMinutes: 20, endQuality: "known", booking: "verified_available", requiresBooking: true, edge: "verified_but_synthetic" },
  { id: "dt-bs-escape", title: "[DEMO] Mini Escape Room", kind: "bookable_slot", categories: ["family", "nightlife"], summary: "40-min puzzle room.", durMin: 40, durMax: 40, venue: "dt_granville", starts: ["17:00", "18:00"], end: null, slotMinutes: 40, endQuality: "known", booking: "full", requiresBooking: true, edge: "sold_out" },

  // ---- Richmond City Centre (10) ----
  { id: "rm-ev-dance", title: "[DEMO] Plaza Line-Dance Class", kind: "scheduled_event", categories: ["wellness", "music"], summary: "Beginner-friendly 45 min class.", durMin: 45, durMax: 45, venue: "rm_plaza", starts: ["18:00"], end: "18:45", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "rm-ev-taichi", title: "[DEMO] Morning Tai Chi", kind: "scheduled_event", categories: ["wellness", "outdoors"], summary: "Outdoor group session.", durMin: 30, durMax: 60, venue: "rm_park", starts: ["08:00"], end: "09:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "rm-ev-story", title: "[DEMO] Family Story Hour", kind: "scheduled_event", categories: ["family", "learning"], summary: "Stories for kids 3–8.", durMin: 45, durMax: 60, venue: "rm_studio", starts: ["10:30", "15:30"], end: null, endQuality: "unknown", booking: "unknown", requiresBooking: null, edge: "unknown_end" },
  { id: "rm-ev-dup", title: "[DEMO] Plaza Line-Dance Class", kind: "scheduled_event", categories: ["wellness", "music"], summary: "Duplicate of rm-ev-dance from a second feed.", durMin: 45, durMax: 45, venue: "rm_plaza", starts: ["18:00"], end: "18:45", endQuality: "known", booking: "unknown", requiresBooking: false, edge: "duplicate" },
  { id: "rm-di-bites", title: "[DEMO] Night Bites Food Stalls", kind: "drop_in", categories: ["food_drink", "nightlife"], summary: "Food stalls; weekend evenings.", durMin: 30, durMax: 90, venue: "rm_bites", starts: ["17:00"], end: "23:30", endQuality: "known", booking: "unknown", requiresBooking: false, days: "weekends" },
  { id: "rm-di-park", title: "[DEMO] Park Pond Loop", kind: "drop_in", categories: ["outdoors"], summary: "Easy 1.5 km loop.", durMin: 20, durMax: 40, venue: "rm_park", starts: ["06:00"], end: "22:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "rm-di-bubble", title: "[DEMO] Bubble Tea Corner", kind: "drop_in", categories: ["food_drink"], summary: "Grab-and-go drinks.", durMin: 10, durMax: 25, venue: "rm_plaza", starts: ["11:00"], end: "22:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "rm-di-gallery", title: "[DEMO] Community Art Wall", kind: "drop_in", categories: ["arts"], summary: "Rotating community art display.", durMin: 15, durMax: 30, venue: "rm_studio", starts: ["10:00"], end: "18:00", endQuality: "known", booking: "unknown", requiresBooking: false },
  { id: "rm-bs-badminton", title: "[DEMO] Badminton Court Hour", kind: "bookable_slot", categories: ["sports"], summary: "Court rental; inventory not verified.", durMin: 60, durMax: 60, venue: "rm_studio", starts: ["17:00", "18:00", "19:00", "20:00"], end: null, slotMinutes: 60, endQuality: "known", booking: "unknown", requiresBooking: true },
  { id: "rm-bs-karaoke", title: "[DEMO] Karaoke Room", kind: "bookable_slot", categories: ["nightlife", "music"], summary: "60-min private room.", durMin: 60, durMax: 60, venue: "rm_bites", starts: ["19:00", "20:00", "21:00"], end: null, slotMinutes: 60, endQuality: "known", booking: "sales_open_not_inventory", requiresBooking: true },
];

function isActiveOn(days: Days | undefined, isoDate: string): boolean {
  if (!days || days === "all") return true;
  const dow = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  return days === "weekends" ? weekend : !weekend;
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const toUtc = (date: string, hhmm: string) => localToUtc(`${date}T${hhmm}`, DISPLAY_TZ).utc;

/** Materialize demo occurrences for the local dates covering [now, now + horizonHours]. */
export function buildDemoCandidates(now: string, horizonHours = 30): Candidate[] {
  const firstDate = shiftDate(localDate(now), -1); // include yesterday for spans crossing midnight
  const lastDate = localDate(addMinutes(now, horizonHours * 60));
  const dates: string[] = [];
  for (let d = firstDate; d <= lastDate; d = shiftDate(d, 1)) dates.push(d);

  const out: Candidate[] = [];
  for (const t of DEMO_TEMPLATES) {
    const v = DEMO_VENUES[t.venue]!;
    for (const date of dates) {
      if (!isActiveOn(t.days, date)) continue;
      for (const start of t.starts) {
        const startsAt = start ? toUtc(date, start) : null;
        let endsAt: string | null = null;
        if (t.end) {
          const endDate = start && t.end < start ? shiftDate(date, 1) : date;
          endsAt = toUtc(endDate, t.end);
        } else if (t.slotMinutes && startsAt) {
          endsAt = addMinutes(startsAt, t.slotMinutes);
        }
        const key = `${date}T${start ?? "open"}`;
        out.push({
          occurrenceId: `${t.id}@${key}`,
          activityId: t.id,
          title: t.title,
          kind: t.kind,
          categories: t.categories,
          shortSummary: t.summary,
          durationMinMinutes: t.durMin,
          durationMaxMinutes: t.durMax,
          venue: { ...v, timezone: DISPLAY_TZ },
          startsAt,
          endsAt,
          originalTimezone: DISPLAY_TZ,
          endTimeQuality: t.endQuality,
          cancellationStatus: t.cancellation ?? "scheduled",
          requiresBooking: t.requiresBooking,
          availability: { state: t.booking, verifiedAt: null, expiresAt: null, verificationSource: "synthetic" },
          source: {
            name: t.edge === "duplicate" ? `${DEMO_SOURCE_NAME}-feed-b` : DEMO_SOURCE_NAME,
            externalId: `${t.id}:${key}`,
            url: null,
            permission: "synthetic",
            lastSourceUpdate: null,
            isDemo: true,
          },
        });
      }
    }
    // Always-open drop-ins (null start) only need one record regardless of date.
    if (t.starts.every((s) => s === null)) {
      const firstForTemplate = out.findIndex((c) => c.activityId === t.id);
      const extras = out.filter((c, i) => c.activityId === t.id && i !== firstForTemplate);
      for (const e of extras) out.splice(out.indexOf(e), 1);
      const kept = out[firstForTemplate];
      if (kept) kept.occurrenceId = `${t.id}@open`;
    }
  }
  return out;
}
