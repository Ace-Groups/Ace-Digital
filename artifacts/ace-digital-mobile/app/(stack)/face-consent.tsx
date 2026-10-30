import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { PhaseButton, PhaseCard, PhaseScreen } from "@/components/phase2b/ui";
import { SelfieCapture, type CaptureResult } from "@/components/phase2b/SelfieCapture";
import { FACE_CONSENT_VERSION, enrollFace } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

export const CONSENT_COPY = [
  "The face measurement is calculated on this phone and stored so later check-ins can be compared.",
  "The selfie photo is kept for about 30 days, then deleted.",
  "Your manager can see the photo and the match score when a check-in needs review.",
  "A failed match is sent to a person. It is not an automatic rejection.",
  "Ace does not log keystrokes, take hidden screenshots, or watch the camera in the background. You can withdraw this and delete the measurement.",
];

export default function FaceConsentScreen() {
  const t = usePhase2b();
  const [agreed, setAgreed] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  async function save(capture: CaptureResult) {
    try {
      await enrollFace({ ...capture, consent: true, consentVersion: FACE_CONSENT_VERSION });
      setMessage("Face enrolled. You can withdraw it from this screen later.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enroll");
    }
  }

  return (
    <PhaseScreen title="Face check-in">
      <ScrollView>
        <PhaseCard>
          {CONSENT_COPY.map((line) => (
            <Text key={line} style={{ color: t.text, marginBottom: 8 }}>{line}</Text>
          ))}
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((value) => !value)} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ color: t.text }}>{agreed ? "☑" : "☐"} I agree to this face check-in</Text>
          </Pressable>
        </PhaseCard>
        {!ready ? (
          <View style={{ gap: 12 }}>
            <PhaseButton label="Take enrollment selfie" onPress={() => agreed && setReady(true)} />
            <PhaseButton label="Not now" onPress={() => router.back()} />
          </View>
        ) : (
          <SelfieCapture onCapture={(capture) => void save(capture)} />
        )}
        {message ? <Text style={{ color: t.muted, marginTop: 12 }}>{message}</Text> : null}
      </ScrollView>
    </PhaseScreen>
  );
}
