import { useEffect, useState } from "react";
import { decideFaceReview, getReviews, REASON_LABEL, type FaceReview } from "@/lib/accountability-api";

export function FaceReviewQueue({
  reviews,
  names,
  onDecide,
}: {
  reviews: FaceReview[];
  names?: Record<number, string>;
  onDecide?: (id: string, decision: "accepted" | "declined", note: string) => void;
}) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="face-review-heading" className="rounded-xl border border-border bg-card p-4">
      <h2 id="face-review-heading" className="text-base font-semibold">
        Face reviews
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">A failed match waits here. It does not reject the check-in.</p>
      <ul className="mt-3 divide-y divide-border">
        {reviews.map((review) => (
          <ReviewRow key={review.id} review={review} name={names?.[review.userId]} onDecide={onDecide} />
        ))}
      </ul>
    </section>
  );
}

function ReviewRow({
  review,
  name,
  onDecide,
}: {
  review: FaceReview;
  name?: string;
  onDecide?: (id: string, decision: "accepted" | "declined", note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <li className="py-3">
      <p className="font-medium">{name ?? `Person ${review.userId}`}</p>
      <p className="text-sm text-muted-foreground">
        {review.source} · {REASON_LABEL[review.reason] ?? review.reason}
        {review.score != null ? ` · ${review.score.toFixed(2)}` : ""}
      </p>
      {onDecide && review.status === "pending" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`note-${review.id}`}>
            Review note
          </label>
          <input
            id={`note-${review.id}`}
            className="min-h-11 min-w-40 flex-1 rounded-lg border border-border bg-background px-3"
            value={note}
            placeholder="Short note"
            onChange={(event) => setNote(event.target.value)}
          />
          <button type="button" className="min-h-11 rounded-lg bg-primary px-3 text-sm text-primary-foreground" onClick={() => onDecide(review.id, "accepted", note)}>
            Accept
          </button>
          <button type="button" className="min-h-11 rounded-lg border border-border px-3 text-sm" onClick={() => onDecide(review.id, "declined", note)}>
            Decline
          </button>
        </div>
      )}
    </li>
  );
}

export function ConnectedFaceReviews() {
  const [reviews, setReviews] = useState<FaceReview[]>([]);
  useEffect(() => {
    getReviews("pending").then(setReviews).catch(() => setReviews([]));
  }, []);
  return (
    <FaceReviewQueue
      reviews={reviews}
      onDecide={(id, decision, note) => {
        decideFaceReview(id, decision, note)
          .then(() => setReviews((current) => current.filter((review) => review.id !== id)))
          .catch(() => undefined);
      }}
    />
  );
}
