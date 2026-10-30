import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { PhaseCard, PhaseScreen } from "@/components/phase2b/ui";
import { SelfieCapture, type CaptureResult } from "@/components/phase2b/SelfieCapture";
import { confirmPing, presenceToday, type PingRow } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

export default function PresencePingScreen() {
  const t = usePhase2b();
  const [note, setNote] = useState("Presence checks are visible. Nothing is captured in the background.");
  const [pings, setPings] = useState<PingRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    presenceToday()
      .then((body) => {
        setNote(body.note);
        setPings(body.pings.filter((ping) => ping.status === "pending"));
      })
      .catch(() => undefined);
  }, []);

  async function submit(id: string, capture: CaptureResult) {
    try {
      await confirmPing(id, capture);
      setMessage("Presence confirmed.");
      setPings((current) => current.filter((ping) => ping.id !== id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not confirm");
    }
  }

  return (
    <PhaseScreen title="Presence">
      <ScrollView>
        <Text style={{ color: t.muted, marginBottom: 12 }}>{note}</Text>
        {pings.length === 0 && <Text style={{ color: t.text }}>No presence check is waiting.</Text>}
        {pings.map((ping) => (
          <PhaseCard key={ping.id}>
            <Text style={{ color: t.text, marginBottom: 8 }}>Confirm you are working. Due {ping.dueAt.slice(11, 16)} UTC.</Text>
            <SelfieCapture onCapture={(capture) => void submit(ping.id, capture)} />
          </PhaseCard>
        ))}
        {message ? <Text style={{ color: t.text, marginTop: 12 }}>{message}</Text> : null}
      </ScrollView>
    </PhaseScreen>
  );
}
