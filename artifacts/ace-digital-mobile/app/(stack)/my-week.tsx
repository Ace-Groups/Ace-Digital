import { useEffect, useState } from "react";
import { Text } from "react-native";
import { PhaseCard, PhaseScreen } from "@/components/phase2b/ui";
import { myScorecard, type ScoreRow } from "@/lib/phase2b-api";
import { usePhase2b } from "@/theme/phase2b";

function percent(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export default function MyWeekScreen() {
  const t = usePhase2b();
  const [card, setCard] = useState<ScoreRow | null>(null);
  useEffect(() => {
    myScorecard().then(setCard).catch(() => setCard(null));
  }, []);
  return (
    <PhaseScreen title="My week">
      <PhaseCard>
        <Text style={{ color: t.text }}>Attendance {percent(card?.attendanceRate ?? null)}</Text>
        <Text style={{ color: t.text }}>On time {percent(card?.punctualityRate ?? null)}</Text>
        <Text style={{ color: t.text }}>Tasks {card ? `${card.tasksOnTime}/${card.tasksDue}` : "—"}</Text>
        <Text style={{ color: t.text }}>Reviews {card ? `${card.reviewsAccepted}/${card.reviewsDecided}` : "—"}</Text>
      </PhaseCard>
      <Text style={{ color: t.muted }}>This is the same scorecard your manager sees for you.</Text>
    </PhaseScreen>
  );
}
