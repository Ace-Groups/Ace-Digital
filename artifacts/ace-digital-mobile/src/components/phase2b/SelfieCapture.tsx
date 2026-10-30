import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { pickPrompt, promptLabel, startLiveness, stepLiveness, type LivenessSession } from "@workspace/accountability";
import { detectFaces } from "@/lib/face-detector";
import { usePhase2b } from "@/theme/phase2b";
import { PhaseButton } from "./ui";

export type CaptureResult = {
  imageBase64: string;
  embedding: number[] | null;
  landmarks: unknown;
  liveness: "passed" | "failed" | "unavailable";
};

export function SelfieCapture({ onCapture }: { onCapture: (result: CaptureResult) => void }) {
  const t = usePhase2b();
  const camera = useRef<CameraView>(null);
  const [permission, request] = useCameraPermissions();
  const [prompt] = useState(() => pickPrompt(String(Date.now())));
  const [session, setSession] = useState<LivenessSession>(() => startLiveness(prompt, Date.now()));
  const [detector, setDetector] = useState<boolean | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    if (!permission?.granted) return;
    const timer = setInterval(() => {
      void (async () => {
        const photo = await camera.current?.takePictureAsync({ base64: false, quality: 0.2, shutterSound: false });
        if (!photo?.uri) return;
        const sample = await detectFaces(photo.uri);
        setDetector(Boolean(sample.embedding));
        if (!sample.embedding) return;
        setSession(stepLiveness(sessionRef.current, { eyeOpen: sample.eyeOpen, yaw: sample.yaw }, Date.now()));
      })();
    }, 900);
    return () => clearInterval(timer);
  }, [permission?.granted]);

  async function submit() {
    const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.5 });
    if (!photo?.base64) return;
    const sample = await detectFaces(photo.uri);
    const liveness = sample.embedding == null ? "unavailable" : session.passed ? "passed" : "failed";
    onCapture({
      imageBase64: photo.base64,
      embedding: sample.embedding,
      landmarks: sample.landmarks,
      liveness,
    });
  }

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View>
        <Text style={{ color: t.text, marginBottom: 12 }}>
          The camera is used only when you take this selfie. Ace does not watch the camera in the background.
        </Text>
        <PhaseButton label="Allow camera" onPress={() => void request()} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: t.text, fontSize: 16 }}>{promptLabel(prompt)}</Text>
      <Text style={{ color: t.muted }}>
        {detector === false ? "This build has no on-device face model. The selfie still goes to a person for review." : session.passed ? "Liveness passed." : "Hold the phone in front of your face."}
      </Text>
      <CameraView ref={camera} facing="front" style={{ height: 280, borderRadius: 16, overflow: "hidden" }} />
      <PhaseButton label="Use this selfie" onPress={() => void submit()} />
    </View>
  );
}
