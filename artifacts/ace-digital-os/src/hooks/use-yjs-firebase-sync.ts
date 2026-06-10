import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";
import {
  get,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  type Database,
  type DatabaseReference,
} from "firebase/database";
import { generateJSON } from "@tiptap/html";
import { Editor } from "@tiptap/core";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import { getFirebaseRtdbWhenReady } from "@/lib/firebase-rtdb";
import {
  base64ToUint8Array,
  getCollaboratorColor,
  isYFragmentEmpty,
  uint8ArrayToBase64,
} from "@/lib/yjs-utils";
import { createNoteEditorExtensions } from "@/components/notes/note-editor-extensions";

export type YjsSyncStatus = "loading" | "synced" | "syncing" | "offline" | "error";

export type UseYjsFirebaseSyncOptions = {
  noteId: number;
  userId: number;
  userName: string;
  /** Postgres HTML used to seed an empty Y.Doc on first open. */
  initialHtml?: string;
  enabled?: boolean;
};

export type UseYjsFirebaseSyncResult = {
  ydoc: Y.Doc | null;
  awareness: Awareness | null;
  /** Minimal provider shape required by CollaborationCaret. */
  provider: { awareness: Awareness } | null;
  /** True once IndexedDB + optional RTDB replay + Postgres seeding have finished. */
  docReady: boolean;
  status: YjsSyncStatus;
  error: Error | null;
  userColor: string;
};

type RtdbUpdatePayload = {
  u: string;
  by: number;
  t: number | object;
};

type RtdbAwarenessPayload = {
  userId: string;
  update: string;
};

function isEffectivelyEmptyHtml(html: string): boolean {
  const trimmed = html.trim();
  return !trimmed || trimmed === "<p></p>";
}

/**
 * Local-first Yjs sync over Firebase RTDB with IndexedDB persistence.
 * Relays Yjs binary updates and awareness state between collaborators.
 */
export function useYjsFirebaseSync({
  noteId,
  userId,
  userName,
  initialHtml = "",
  enabled = true,
}: UseYjsFirebaseSyncOptions): UseYjsFirebaseSyncResult {
  const userColor = useMemo(() => getCollaboratorColor(userId), [userId]);
  const [status, setStatus] = useState<YjsSyncStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [docReady, setDocReady] = useState(false);

  const initialHtmlRef = useRef(initialHtml);
  initialHtmlRef.current = initialHtml;

  useEffect(() => {
    if (!enabled || noteId <= 0) {
      setYdoc(null);
      setAwareness(null);
      setDocReady(false);
      setStatus("loading");
      setError(null);
      return;
    }

    let cancelled = false;
    const doc = new Y.Doc();
    const awarenessInstance = new Awareness(doc);
    const clientId = doc.clientID;

    setYdoc(doc);
    setAwareness(awarenessInstance);
    setDocReady(false);
    setStatus("loading");
    setError(null);

    awarenessInstance.setLocalStateField("user", {
      name: userName,
      color: userColor,
      userId,
    });

    const idb = new IndexeddbPersistence(`ace-note-${noteId}`, doc);
    const unsubs: Array<() => void> = [];
    let connected = false;
    let awarenessRef: DatabaseReference | null = null;
    let rtdb: Database | null = null;

    const seedFromPostgresIfEmpty = () => {
      const fragment = doc.getXmlFragment("default");
      if (!isYFragmentEmpty(fragment)) return;

      const html = initialHtmlRef.current.trim();
      if (isEffectivelyEmptyHtml(html)) return;

      const extensions = createNoteEditorExtensions({ collaborative: true });
      const json = generateJSON(html, extensions);
      const tempEditor = new Editor({ extensions, content: "" });
      const schema = tempEditor.schema;
      tempEditor.destroy();

      doc.transact(() => {
        prosemirrorJSONToYXmlFragment(schema, json, fragment);
      });
    };

    const applyExistingRtdbUpdates = async (
      database: Database,
      appliedUpdateKeys: Set<string>,
    ) => {
      const updatesRef = ref(database, `note_collab/${noteId}/updates`);
      const existingSnap = await get(updatesRef);
      if (!existingSnap.exists()) return;

      const entries = existingSnap.val() as Record<string, RtdbUpdatePayload>;
      for (const [key, payload] of Object.entries(entries)) {
        if (!payload?.u) continue;
        appliedUpdateKeys.add(key);
        Y.applyUpdate(doc, base64ToUint8Array(payload.u), "firebase");
      }
    };

    const setupRtdbRelay = (
      database: Database,
      appliedUpdateKeys: Set<string>,
    ) => {
      const updatesRef = ref(database, `note_collab/${noteId}/updates`);
      awarenessRef = ref(database, `note_collab/${noteId}/awareness/${clientId}`);
      const connectedRef = ref(database, ".info/connected");

      const connectedUnsub = onValue(connectedRef, (snap) => {
        connected = Boolean(snap.val());
        if (!cancelled) setStatus(connected ? "synced" : "offline");
      });
      unsubs.push(connectedUnsub);

      const updatesUnsub = onChildAdded(updatesRef, (snapshot) => {
        const key = snapshot.key;
        if (!key || appliedUpdateKeys.has(key)) return;

        const payload = snapshot.val() as RtdbUpdatePayload | null;
        if (!payload?.u) return;

        appliedUpdateKeys.add(key);
        Y.applyUpdate(doc, base64ToUint8Array(payload.u), "firebase");
      });
      unsubs.push(updatesUnsub);

      const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === "firebase") return;
        if (!cancelled) setStatus(connected ? "syncing" : "offline");
        void push(updatesRef, {
          u: uint8ArrayToBase64(update),
          by: userId,
          t: serverTimestamp(),
        } satisfies RtdbUpdatePayload).then(() => {
          if (!cancelled) setStatus(connected ? "synced" : "offline");
        });
      };
      doc.on("update", onLocalUpdate);
      unsubs.push(() => doc.off("update", onLocalUpdate));

      const publishAwareness = () => {
        if (!awarenessRef) return;
        const encoded = encodeAwarenessUpdate(awarenessInstance, [clientId]);
        void set(awarenessRef, {
          userId: String(userId),
          update: uint8ArrayToBase64(encoded),
        } satisfies RtdbAwarenessPayload);
      };

      const onAwarenessChange = () => {
        publishAwareness();
      };
      awarenessInstance.on("update", onAwarenessChange);
      unsubs.push(() => awarenessInstance.off("update", onAwarenessChange));

      void onDisconnect(awarenessRef).remove();
      publishAwareness();

      const awarenessUnsub = onValue(
        ref(database, `note_collab/${noteId}/awareness`),
        (snapshot) => {
          const all = snapshot.val() as Record<string, RtdbAwarenessPayload> | null;
          if (!all) return;
          for (const [remoteClientId, payload] of Object.entries(all)) {
            if (Number(remoteClientId) === clientId) continue;
            if (!payload?.update) continue;
            applyAwarenessUpdate(
              awarenessInstance,
              base64ToUint8Array(payload.update),
              "firebase",
            );
          }
        },
      );
      unsubs.push(awarenessUnsub);
    };

    const bootstrap = async () => {
      try {
        await idb.whenSynced;
        if (cancelled) return;

        const appliedUpdateKeys = new Set<string>();
        rtdb = await getFirebaseRtdbWhenReady();

        if (rtdb) {
          await applyExistingRtdbUpdates(rtdb, appliedUpdateKeys);
          if (cancelled) return;
        }

        // Postgres is the fallback whenever local + RTDB replay left the doc empty.
        seedFromPostgresIfEmpty();

        if (cancelled) return;

        setDocReady(true);

        if (rtdb) {
          setupRtdbRelay(rtdb, appliedUpdateKeys);
          setStatus(connected ? "synced" : "offline");
        } else {
          setStatus("offline");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          seedFromPostgresIfEmpty();
          setDocReady(true);
          setError(err instanceof Error ? err : new Error(String(err)));
          setStatus("error");
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
      if (rtdb && awarenessRef) {
        void remove(awarenessRef);
      }
      awarenessInstance.destroy();
      doc.destroy();
      void idb.destroy();
      setYdoc(null);
      setAwareness(null);
      setDocReady(false);
    };
  }, [enabled, noteId, userId, userName, userColor]);

  const provider = useMemo(
    () => (awareness ? { awareness } : null),
    [awareness],
  );

  return {
    ydoc,
    awareness,
    provider,
    docReady,
    status,
    error,
    userColor,
  };
}
