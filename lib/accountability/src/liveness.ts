export type LivenessPrompt = "blink" | "turn_left" | "turn_right";

export type LivenessSample = {
  eyeOpen?: number | null;
  yaw?: number | null;
};

export type LivenessSession = {
  prompt: LivenessPrompt;
  startedAt: number;
  windowMs: number;
  stage: 0 | 1 | 2;
  passed: boolean;
  failed: boolean;
};

const PROMPTS: LivenessPrompt[] = ["blink", "turn_left", "turn_right"];

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickPrompt(seed: string): LivenessPrompt {
  return PROMPTS[hashString(seed) % PROMPTS.length];
}

export function promptLabel(prompt: LivenessPrompt): string {
  if (prompt === "blink") return "Blink once";
  if (prompt === "turn_left") return "Turn your head left";
  return "Turn your head right";
}

export function startLiveness(prompt: LivenessPrompt, now: number, windowMs = 8000): LivenessSession {
  return { prompt, startedAt: now, windowMs, stage: 0, passed: false, failed: false };
}

export function livenessPhase(session: LivenessSession): "waiting" | "moved" | "passed" | "failed" {
  if (session.passed) return "passed";
  if (session.failed) return "failed";
  if (session.stage > 0) return "moved";
  return "waiting";
}

export function stepLiveness(session: LivenessSession, sample: LivenessSample, now: number): LivenessSession {
  if (session.passed || session.failed) return session;
  if (now - session.startedAt > session.windowMs) return { ...session, failed: true };
  if (session.prompt === "blink") {
    const eye = sample.eyeOpen ?? 1;
    if (session.stage === 0 && eye > 0.6) return { ...session, stage: 1 };
    if (session.stage === 1 && eye < 0.25) return { ...session, stage: 2 };
    if (session.stage === 2 && eye > 0.6) return { ...session, passed: true };
    return session;
  }
  const yaw = sample.yaw ?? 0;
  if (session.prompt === "turn_left" && yaw <= -18) return { ...session, passed: true };
  if (session.prompt === "turn_right" && yaw >= 18) return { ...session, passed: true };
  if ((session.prompt === "turn_left" && yaw < -6) || (session.prompt === "turn_right" && yaw > 6)) {
    return { ...session, stage: 1 };
  }
  return session;
}
