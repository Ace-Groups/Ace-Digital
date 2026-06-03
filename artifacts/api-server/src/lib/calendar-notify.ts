import { store } from "@workspace/db";

export async function notifyCalendarAttendees(
  attendeeIds: number[],
  actorId: number,
  title: string,
  eventId: number,
): Promise<void> {
  const unique = [...new Set(attendeeIds)].filter((id) => id !== actorId);
  await Promise.all(
    unique.map((userId) =>
      store.createNotification({
        userId,
        title: "Calendar",
        body: `Scheduled: ${title}`,
        link: `/calendar?event=${eventId}`,
      }),
    ),
  );
}

export async function notifyCalendarOwner(
  ownerId: number,
  actorId: number,
  title: string,
  eventId: number,
): Promise<void> {
  if (ownerId === actorId) return;
  await store.createNotification({
    userId: ownerId,
    title: "Calendar",
    body: `${title} was added to your calendar`,
    link: `/calendar?event=${eventId}`,
  });
}
