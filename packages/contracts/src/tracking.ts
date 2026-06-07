import { z } from "zod";

/** Tracking contracts (owned by tracking-svc). */

export const GeoPoint = z.object({ lat: z.number(), lng: z.number() });
export type GeoPoint = z.infer<typeof GeoPoint>;

/** A raw GPS position report from a vehicle/driver. */
export const PositionReport = z.object({
  shipmentId: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  speedKph: z.number().nonnegative().optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  reportedAt: z.string().datetime().optional(), // defaults to server time
});
export type PositionReport = z.infer<typeof PositionReport>;

/** Latest known position + computed ETA/progress for a shipment. */
export const TrackingState = z.object({
  shipmentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  speedKph: z.number().optional(),
  headingDeg: z.number().optional(),
  progress: z.number().min(0).max(100),
  remainingKm: z.number().nonnegative(),
  etaDate: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});
export type TrackingState = z.infer<typeof TrackingState>;

export const Geofence = z.object({
  id: z.string().uuid(),
  shipmentId: z.string().uuid(),
  kind: z.enum(["origin", "destination"]),
  center: GeoPoint,
  radiusKm: z.number().positive(),
});
export type Geofence = z.infer<typeof Geofence>;
