import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { getAccessContext } from "../lib/access";
import { getIo } from "../lib/socket-server";
import { ensureDefaultNotes } from "../lib/default-notes";
import {
  removeNoteFromRtdb,
  syncNoteAclToRtdb,
} from "../lib/note-rtdb-acl";

const notesRouter = Router();

notesRouter.get("/v1/notes", requireAuth, async (req, res, next) => {
  try {
    const ctx = getAccessContext(req);
    
    // Ensure welcome and guide notes exist
    await ensureDefaultNotes(ctx.userId);

    const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
    const notes = await store.listNotes(ctx.userId, { teamId });
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

notesRouter.post("/v1/notes", requireAuth, async (req, res, next) => {
  try {
    const ctx = getAccessContext(req);
    const input = req.body;
    const note = await store.createNote({
      ...input,
      createdById: ctx.userId,
    });

    void syncNoteAclToRtdb(note);

    const io = getIo();
    if (io) {
      io.emit("notes:refresh", {
        noteId: note.id,
        type: "create",
        senderId: ctx.userId,
      });
    }

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

notesRouter.get("/v1/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const ctx = getAccessContext(req);
    const note = await store.findNoteById(Number(req.params.id));
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    const user = await store.findUserById(ctx.userId);
    if (
      note.createdById !== ctx.userId &&
      (!note.teamId || note.teamId !== user?.teamId) &&
      !note.sharedUserIds?.includes(ctx.userId)
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    void syncNoteAclToRtdb(note);

    res.json(note);
  } catch (error) {
    next(error);
  }
});

notesRouter.patch("/v1/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const ctx = getAccessContext(req);
    const note = await store.findNoteById(Number(req.params.id));
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    const user = await store.findUserById(ctx.userId);
    if (
      note.createdById !== ctx.userId &&
      (!note.teamId || note.teamId !== user?.teamId) &&
      !note.sharedUserIds?.includes(ctx.userId)
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const patch = req.body;
    const updated = await store.updateNote(note.id, patch);

    if (updated) {
      void syncNoteAclToRtdb(updated);

      const io = getIo();
      if (io) {
        io.to(`note_${note.id}`).emit("note:saved", {
          noteId: note.id,
          note: updated,
          senderId: ctx.userId,
        });
        io.emit("notes:refresh", {
          noteId: note.id,
          type: "update",
          senderId: ctx.userId,
        });
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

notesRouter.delete("/v1/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const ctx = getAccessContext(req);
    const note = await store.findNoteById(Number(req.params.id));
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    if (note.createdById !== ctx.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await store.deleteNote(note.id);
    void removeNoteFromRtdb(note.id);

    const io = getIo();
    if (io) {
      io.emit("notes:refresh", {
        noteId: note.id,
        type: "delete",
        senderId: ctx.userId,
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default notesRouter;
