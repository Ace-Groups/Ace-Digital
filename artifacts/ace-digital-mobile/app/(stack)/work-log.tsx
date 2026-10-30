import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { PhaseButton, PhaseField, PhaseScreen } from "@/components/phase2b/ui";
import { getLog, saveLog } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

export default function WorkLogScreen() {
  const t = usePhase2b();
  const [summary, setSummary] = useState("");
  const [links, setLinks] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getLog()
      .then((log) => {
        if (!log) return;
        setSummary(log.summary ?? "");
        setLinks((log.links ?? []).join("\n"));
      })
      .catch(() => undefined);
  }, []);

  return (
    <PhaseScreen title="Work log">
      <ScrollView>
        <PhaseField label="What you finished" value={summary} onChangeText={setSummary} multiline />
        <PhaseField label="Proof links" value={links} onChangeText={setLinks} multiline />
        <PhaseButton
          label="Save log"
          onPress={() => {
            const parsed = links.split(/\s+/).map((link) => link.trim()).filter(Boolean);
            saveLog(summary, parsed)
              .then(() => setMessage("Saved."))
              .catch((err: Error) => setMessage(err.message));
          }}
        />
        {message ? <Text style={{ color: t.muted, marginTop: 12 }}>{message}</Text> : null}
      </ScrollView>
    </PhaseScreen>
  );
}
