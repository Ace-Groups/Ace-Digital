export const DEFAULT_VISIT_RADIUS_M = 200;
const EARTH_M = 6_371_000;

export type LatLng = { lat: number; lng: number };

export type VisitDecision = {
  status: "present" | "flagged" | "pending_review";
  flagReason: "mock_location" | "outside_window" | "outside_radius" | "low_accuracy" | "face_review" | null;
  withinRadius: boolean;
};

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parseCoordinatePair(raw: string): LatLng | null {
  const match = raw.trim().match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function parseHm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function withinTimeWindow(nowMinutes: number, start: string, end: string): boolean {
  const from = parseHm(start);
  const to = parseHm(end);
  if (from == null || to == null || to <= from) return false;
  return nowMinutes >= from && nowMinutes < to;
}

export function decideVisit(input: {
  mocked: boolean | null;
  distanceMeters: number;
  radiusMeters: number;
  accuracy: number | null;
  withinWindow: boolean;
  faceNeedsReview: boolean;
}): VisitDecision {
  const withinRadius = input.distanceMeters <= input.radiusMeters;
  if (input.mocked === true) {
    return { status: "flagged", flagReason: "mock_location", withinRadius };
  }
  if (!input.withinWindow) {
    return { status: "flagged", flagReason: "outside_window", withinRadius };
  }
  if (!withinRadius) {
    return { status: "flagged", flagReason: "outside_radius", withinRadius };
  }
  if (input.accuracy != null && input.accuracy > input.radiusMeters) {
    return { status: "pending_review", flagReason: "low_accuracy", withinRadius };
  }
  if (input.faceNeedsReview) {
    return { status: "pending_review", flagReason: "face_review", withinRadius };
  }
  return { status: "present", flagReason: null, withinRadius };
}
