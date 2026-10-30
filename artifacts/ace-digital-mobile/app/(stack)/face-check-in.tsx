import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { PhaseButton, PhaseField, PhaseScreen } from "@/components/phase2b/ui";
import { SelfieCapture, type CaptureResult } from "@/components/phase2b/SelfieCapture";
import { checkIn } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

export default function FaceCheckInScreen() {
  const t = usePhase2b();
  const [plan, setPlan] = useState("");
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(capture: CaptureResult) {
    try {
      const day = (await checkIn({ planNote: plan.trim(), face: capture })) as { faceMatchResult?: string };
      setMessage(day.faceMatchResult === "match" ? "Checked in. The face matched." : "Checked in. A manager will review the selfie.");
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        router.push("/(stack)/face-consent");
        return;
      }
      setMessage(err instanceof Error ? err.message : "Could not check in");
    }
  }

  return (
    <PhaseScreen title="Check in">
      <ScrollView>
        <PhaseField label="Plan for today" value={plan} onChangeText={setPlan} multiline />
        {!started ? (
          <PhaseButton label="Take a selfie" onPress={() => plan.trim().length >= 3 && setStarted(true)} />
        ) : (
          <SelfieCapture onCapture={(capture) => void submit(capture)} />
        )}
        {message ? <Text style={{ color: t.muted, marginTop: 12 }}>{message}</Text> : null}
      </ScrollView>
    </PhaseScreen>
  );
}
