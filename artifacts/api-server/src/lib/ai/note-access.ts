import { store } from "@workspace/db";

/**
 * Whether a user may read a note: they created it, it's shared with them,
 * or it belongs to their team. Mirrors the access rules used by the notes UI.
 */
export async function assertNoteAccess(userId: number, noteId: number): Promise<boolean> {
  const note = await store.findNoteById(noteId);
  if (!note) return false;
  const user = await store.findUserById(userId);
  return (
    note.createdById === userId ||
    (note.sharedUserIds?.includes(userId) ?? false) ||
    (note.teamId != null && note.teamId === user?.teamId)
  );
}
