import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import * as Location from "expo-location";
import { PhaseButton, PhaseCard, PhaseScreen } from "@/components/phase2b/ui";
import { SelfieCapture, type CaptureResult } from "@/components/phase2b/SelfieCapture";
import { checkInVisit, listVisits, type VisitRow } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

const REASONS: Record<string, string> = {
  mock_location: "The location looks mocked.",
  outside_radius: "You are outside the site radius.",
  outside_window: "This is outside the visit window.",
  low_accuracy: "The GPS fix was too coarse.",
  face_review: "The selfie needs a person to review it.",
};

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function FieldVisitScreen() {
  const t = usePhase2b();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    listVisits(today()).then(setVisits).catch(() => setVisits([]));
  }, []);

  async function submit(capture: CaptureResult) {
    if (!active) return;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setMessage("Location is required for a site visit.");
      return;
    }
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const mocked = "mocked" in fix && typeof fix.mocked === "boolean" ? fix.mocked : null;
    try {
      const visit = (await checkInVisit(active, {
        ...capture,
        latitude: fix.coords.latitude,
        longitude: fix.coords.longitude,
        accuracy: fix.coords.accuracy,
        mocked,
      })) as VisitRow;
      const reason = visit.flagReason ? REASONS[visit.flagReason] ?? visit.flagReason : "Present for this visit.";
      setMessage(`${reason}${visit.distanceMeters != null ? ` ${visit.distanceMeters} m away.` : ""}`);
      setVisits(await listVisits(today()));
      setActive(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not check in");
    }
  }

  return (
    <PhaseScreen title="Field visit">
      <ScrollView>
        {visits.map((visit) => (
          <PhaseCard key={visit.id}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>{visit.clientName}</Text>
            <Text style={{ color: t.muted }}>{visit.windowStart}–{visit.windowEnd} · {visit.radiusMeters} m</Text>
            <Text style={{ color: t.muted, marginBottom: 8 }}>{visit.checkedInAt ? visit.status : "Assigned"}</Text>
            {!visit.checkedInAt && <PhaseButton label="Check in on site" onPress={() => setActive(visit.id)} />}
          </PhaseCard>
        ))}
        {visits.length === 0 && <Text style={{ color: t.muted }}>No visit is assigned for today.</Text>}
        {active && <SelfieCapture onCapture={(capture) => void submit(capture)} />}
        {message ? <Text style={{ color: t.text, marginTop: 12 }}>{message}</Text> : null}
      </ScrollView>
    </PhaseScreen>
  );
}
