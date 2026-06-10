import { ensureFirebaseAdminApp } from "@workspace/db";
import { getDatabase } from "firebase-admin/database";
import type { Note } from "@workspace/db";
import { store } from "@workspace/db";

/**
 * Resolves all user ids that may collaborate on a note (matches REST access rules).
 */
export async function resolveNoteMemberIds(note: Note): Promise<number[]> {
  const memberIds = new Set<number>([note.createdById]);

  for (const userId of note.sharedUserIds ?? []) {
    memberIds.add(userId);
  }

  if (note.teamId != null) {
    const teamUsers = await store.listUsers({ teamId: note.teamId });
    for (const user of teamUsers) {
      memberIds.add(user.id);
    }
  }

  return Array.from(memberIds);
}

/**
 * Mirrors note access control to Firebase RTDB so client-side Yjs sync can be secured.
 * Path: note_acl/{noteId}/members/{userId} = true
 */
export async function syncNoteAclToRtdb(note: Note): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() && !process.env.GCLOUD_PROJECT) {
    return;
  }

  try {
    ensureFirebaseAdminApp();
    const db = getDatabase();
    const memberIds = await resolveNoteMemberIds(note);
    const membersRef = db.ref(`note_acl/${note.id}/members`);

    const updates: Record<string, boolean | null> = {};
    for (const userId of memberIds) {
      updates[String(userId)] = true;
    }

    const existing = (await membersRef.get()).val() as Record<string, boolean> | null;
    if (existing) {
      for (const existingUserId of Object.keys(existing)) {
        if (!memberIds.includes(Number(existingUserId))) {
          updates[existingUserId] = null;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await membersRef.update(updates);
    }
  } catch (err) {
    console.error("[note-rtdb-acl] Failed to sync ACL for note", note.id, err);
  }
}

/** Removes RTDB ACL and collaboration state when a note is deleted. */
export async function removeNoteFromRtdb(noteId: number): Promise<void> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() && !process.env.GCLOUD_PROJECT) {
    return;
  }

  try {
    ensureFirebaseAdminApp();
    const db = getDatabase();
    await Promise.all([
      db.ref(`note_acl/${noteId}`).remove(),
      db.ref(`note_collab/${noteId}`).remove(),
    ]);
  } catch (err) {
    console.error("[note-rtdb-acl] Failed to remove note from RTDB", noteId, err);
  }
}
