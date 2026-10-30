import { percent, type Scorecard } from "@/lib/accountability-api";

export function ScorecardList({ cards }: { cards: Scorecard[] }) {
  if (cards.length === 0) {
    return <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">No scorecard for this week yet.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {cards.map((card) => (
        <li key={card.userId} className="px-4 py-3">
          <p className="font-medium">{card.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Attendance {percent(card.attendanceRate)} · On time {percent(card.punctualityRate)} · Tasks {card.tasksOnTime}/{card.tasksDue} · Reviews {card.reviewsAccepted}/{card.reviewsDecided}
          </p>
        </li>
      ))}
    </ul>
  );
}
