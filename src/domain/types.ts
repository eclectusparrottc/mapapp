import { z } from "zod";

/**
 * CityGap domain model (see docs/ADR/ADR-004).
 * Activity, venue, occurrence and availability are separate on purpose:
 * "event announced" != "joinable now", "tickets on sale" != "a seat for you",
 * "venue open" != "capacity confirmed", "end time unknown" != "60 minutes".
 */

export const ActivityKind = z.enum(["scheduled_event", "drop_in", "bookable_slot"]);
export type ActivityKind = z.infer<typeof ActivityKind>;

export const Category = z.enum([
  "arts",
  "music",
  "food_drink",
  "outdoors",
  "sports",
  "learning",
  "shopping",
  "family",
  "nightlife",
  "wellness",
]);
export type Category = z.infer<typeof Category>;

export const EndTimeQuality = z.enum(["known", "estimated", "unknown"]);
export type EndTimeQuality = z.infer<typeof EndTimeQuality>;

export const CancellationStatus = z.enum(["scheduled", "cancelled", "postponed"]);
export type CancellationStatus = z.infer<typeof CancellationStatus>;

export const BookingState = z.enum([
  "verified_available",
  "sales_open_not_inventory",
  "unknown",
  "full",
  "unavailable",
]);
export type BookingState = z.infer<typeof BookingState>;

/** Rights to show a record publicly. Only `authorized` and `synthetic` (labeled DEMO) may reach users. */
export const DataPermissionStatus = z.enum(["authorized", "synthetic", "unverified", "denied"]);
export type DataPermissionStatus = z.infer<typeof DataPermissionStatus>;

export const LatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLng>;

const IsoUtc = z.string().datetime({ offset: true });

export const Venue = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  address: z.string().nullable(),
  timezone: z.string().min(1),
});
export type Venue = z.infer<typeof Venue>;

export const Availability = z.object({
  state: BookingState,
  verifiedAt: IsoUtc.nullable(),
  expiresAt: IsoUtc.nullable(),
  verificationSource: z.string().nullable(),
});
export type Availability = z.infer<typeof Availability>;

export const SourceInfo = z.object({
  name: z.string().min(1),
  externalId: z.string().min(1),
  url: z.string().url().nullable(),
  permission: DataPermissionStatus,
  lastSourceUpdate: IsoUtc.nullable(),
  isDemo: z.boolean(),
});
export type SourceInfo = z.infer<typeof SourceInfo>;

/**
 * One occurrence joined with its activity, venue and latest availability:
 * the unit the engine reasons about. For drop-ins, startsAt/endsAt are the
 * opening window for that day (null = unknown).
 */
export const Candidate = z.object({
  occurrenceId: z.string().min(1),
  activityId: z.string().min(1),
  title: z.string().min(1),
  kind: ActivityKind,
  categories: z.array(Category),
  shortSummary: z.string(),
  /** Minimum meaningful time at the activity, minutes. null = unknown. */
  durationMinMinutes: z.number().int().positive().nullable(),
  durationMaxMinutes: z.number().int().positive().nullable(),
  venue: Venue,
  startsAt: IsoUtc.nullable(),
  endsAt: IsoUtc.nullable(),
  originalTimezone: z.string().min(1),
  endTimeQuality: EndTimeQuality,
  cancellationStatus: CancellationStatus,
  /** null = unknown whether booking/registration is required. */
  requiresBooking: z.boolean().nullable(),
  availability: Availability,
  source: SourceInfo,
});
export type Candidate = z.infer<typeof Candidate>;

export const NextCommitment = z.object({
  name: z.string().min(1),
  location: LatLng,
  startsAt: IsoUtc,
  arrivalBufferMinutes: z.number().int().min(0).max(180),
});
export type NextCommitment = z.infer<typeof NextCommitment>;

export const Origin = LatLng.extend({
  label: z.string().min(1),
  /** True when the user did not share location and picked/defaulted to a sample start. */
  isSample: z.boolean(),
});
export type Origin = z.infer<typeof Origin>;

export const TravelMode = z.enum(["walking"]);

export const RecommendationQuery = z
  .object({
    mode: z.enum(["before_next_plan", "free_time"]),
    now: IsoUtc,
    origin: Origin,
    nextCommitment: NextCommitment.optional(),
    freeMinutes: z.number().int().min(15).max(240).optional(),
    travelMode: TravelMode.default("walking"),
    interests: z.array(Category).default([]),
    topN: z.number().int().min(1).max(10).default(3),
  })
  .superRefine((q, ctx) => {
    if (q.mode === "before_next_plan" && !q.nextCommitment) {
      ctx.addIssue({ code: "custom", message: "nextCommitment is required in before_next_plan mode" });
    }
    if (q.mode === "free_time" && q.freeMinutes === undefined) {
      ctx.addIssue({ code: "custom", message: "freeMinutes is required in free_time mode" });
    }
  });
export type RecommendationQuery = z.input<typeof RecommendationQuery>;
export type ParsedQuery = z.output<typeof RecommendationQuery>;

export const ConfidenceLevel = z.enum([
  "confirmed_from_authorized_source",
  "schedule_known_capacity_unknown",
  "estimated_only",
]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const Unknown = z.enum([
  "capacity_not_verified",
  "availability_snapshot_expired",
  "end_time_unknown",
  "end_time_estimated",
  "closing_time_unknown",
  "duration_unknown",
  "booking_may_be_required",
  "booking_required",
  "travel_time_is_estimate",
  "start_location_is_sample",
  "synthetic_demo_data",
]);
export type Unknown = z.infer<typeof Unknown>;

export const RejectionReason = z.enum([
  "cancelled",
  "postponed",
  "full",
  "unavailable",
  "permission_not_public",
  "missing_time",
  "missing_coordinates",
  "invalid_coordinates",
  "duplicate",
  "too_far",
  "already_ended",
  "already_started",
  "starts_after_window",
  "not_enough_time",
  "closes_too_soon",
]);
export type RejectionReason = z.infer<typeof RejectionReason>;
