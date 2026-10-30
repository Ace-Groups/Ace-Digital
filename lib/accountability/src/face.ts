export const EMBEDDING_LENGTH = 12;
export const MATCH_THRESHOLD = 0.9;
export const FACE_CONSENT_VERSION = "2026-10-24";
export const SELFIE_RETENTION_DAYS = 30;

export type Point = { x: number; y: number };

export type FaceLandmarks = {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  mouthLeft: Point;
  mouthRight: Point;
  leftEar?: Point | null;
  rightEar?: Point | null;
};

export type FaceDecision = {
  score: number | null;
  result: "match" | "review";
  reason: "score" | "low_score" | "liveness_failed" | "liveness_unavailable" | "no_embedding";
};

function rotate(point: Point, origin: Point, cos: number, sin: number, scale: number): Point {
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  return {
    x: (x * cos + y * sin) / scale,
    y: (-x * sin + y * cos) / scale,
  };
}

/** Landmark embedding normalized by inter-eye distance. Eyes are the frame, not the vector. */
export function embeddingFromLandmarks(face: FaceLandmarks): number[] | null {
  const dx = face.rightEye.x - face.leftEye.x;
  const dy = face.rightEye.y - face.leftEye.y;
  const dist = Math.hypot(dx, dy);
  if (!Number.isFinite(dist) || dist < 1e-3) return null;
  const origin = {
    x: (face.leftEye.x + face.rightEye.x) / 2,
    y: (face.leftEye.y + face.rightEye.y) / 2,
  };
  const cos = dx / dist;
  const sin = dy / dist;
  const nose = rotate(face.nose, origin, cos, sin, dist);
  const mouthLeft = rotate(face.mouthLeft, origin, cos, sin, dist);
  const mouthRight = rotate(face.mouthRight, origin, cos, sin, dist);
  const leftEar = face.leftEar ? rotate(face.leftEar, origin, cos, sin, dist) : { x: 0, y: 0 };
  const rightEar = face.rightEar ? rotate(face.rightEar, origin, cos, sin, dist) : { x: 0, y: 0 };
  const mouthWidth = Math.hypot(mouthRight.x - mouthLeft.x, mouthRight.y - mouthLeft.y);
  const noseToMouth = Math.hypot((mouthLeft.x + mouthRight.x) / 2 - nose.x, (mouthLeft.y + mouthRight.y) / 2 - nose.y);
  const vector = [
    nose.x,
    nose.y,
    mouthLeft.x,
    mouthLeft.y,
    mouthRight.x,
    mouthRight.y,
    mouthWidth,
    noseToMouth,
    leftEar.x,
    leftEar.y,
    rightEar.x,
    rightEar.y,
  ];
  if (vector.length !== EMBEDDING_LENGTH || vector.some((n) => !Number.isFinite(n))) return null;
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return null;
  return dot / Math.sqrt(na * nb);
}

export function decideFaceMatch(
  enrolled: number[] | null | undefined,
  live: number[] | null | undefined,
  liveness: "passed" | "failed" | "unavailable" | null,
): FaceDecision {
  if (
    !enrolled ||
    !live ||
    enrolled.length !== EMBEDDING_LENGTH ||
    live.length !== EMBEDDING_LENGTH
  ) {
    return { score: null, result: "review", reason: "no_embedding" };
  }
  const score = cosineSimilarity(enrolled, live);
  if (score == null) return { score: null, result: "review", reason: "no_embedding" };
  if (liveness === "failed") return { score, result: "review", reason: "liveness_failed" };
  if (liveness !== "passed") return { score, result: "review", reason: "liveness_unavailable" };
  if (score < MATCH_THRESHOLD) return { score, result: "review", reason: "low_score" };
  return { score, result: "match", reason: "score" };
}

export function retainUntil(from: Date, days = SELFIE_RETENTION_DAYS): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isPastRetention(until: string | null | undefined, now: Date): boolean {
  if (!until) return false;
  const time = Date.parse(until);
  return Number.isFinite(time) && now.getTime() > time;
}
