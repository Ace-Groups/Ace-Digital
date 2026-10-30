import { embeddingFromLandmarks, type FaceLandmarks } from "@workspace/accountability";

export type DetectorSample = {
  landmarks: FaceLandmarks | null;
  embedding: number[] | null;
  eyeOpen: number | null;
  yaw: number | null;
};

type MlFace = {
  landmarks?: Record<string, { position?: { x: number; y: number } } | undefined>;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  headEulerAngleY?: number;
};

function point(face: MlFace, key: string) {
  const position = face.landmarks?.[key]?.position;
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  return { x: position.x, y: position.y };
}

export function sampleFromFace(face: MlFace | undefined): DetectorSample {
  if (!face) return { landmarks: null, embedding: null, eyeOpen: null, yaw: null };
  const leftEye = point(face, "leftEye");
  const rightEye = point(face, "rightEye");
  const nose = point(face, "noseBase");
  const mouthLeft = point(face, "mouthLeft");
  const mouthRight = point(face, "mouthRight");
  const landmarks =
    leftEye && rightEye && nose && mouthLeft && mouthRight
      ? {
          leftEye,
          rightEye,
          nose,
          mouthLeft,
          mouthRight,
          leftEar: point(face, "leftEar"),
          rightEar: point(face, "rightEar"),
        }
      : null;
  const eyes = [face.leftEyeOpenProbability, face.rightEyeOpenProbability].filter((n): n is number => typeof n === "number");
  return {
    landmarks,
    embedding: landmarks ? embeddingFromLandmarks(landmarks) : null,
    eyeOpen: eyes.length ? Math.min(...eyes) : null,
    yaw: typeof face.headEulerAngleY === "number" ? face.headEulerAngleY : null,
  };
}

export async function detectFaces(uri: string): Promise<DetectorSample> {
  try {
    const req = (0, eval)("require") as (name: string) => { default?: { detect: (uri: string) => Promise<MlFace[]> }; detect?: (uri: string) => Promise<MlFace[]> };
    const mod = req("@react-native-ml-kit/face-detection");
    const detect = mod.detect ?? mod.default?.detect;
    if (!detect) return { landmarks: null, embedding: null, eyeOpen: null, yaw: null };
    const faces = await detect(uri);
    return sampleFromFace(faces[0]);
  } catch {
    return { landmarks: null, embedding: null, eyeOpen: null, yaw: null };
  }
}
