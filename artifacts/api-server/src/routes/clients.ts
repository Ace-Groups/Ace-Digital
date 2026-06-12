import { Router } from "express";
import { store } from "@workspace/db";
import type { Client } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";
import { sanitizeCustomFields } from "../lib/client-fields";
import { logActivity } from "../lib/activity-log";

const router = Router();

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function optionalEmail(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null;
  return text.toLowerCase();
}

async function clientWithRelations(c: Client) {
  const team = c.assignedTeamId ? await store.findTeamById(c.assignedTeamId) : null;
  return {
    id: c.id,
    salutation: c.salutation ?? null,
    contactName: c.contactName ?? null,
    companyName: c.companyName,
    email: c.email ?? null,
    phone: c.phone,
    assignedTeamId: c.assignedTeamId,
    assignedTeamName: team?.name ?? null,
    status: c.status,
    contractValue: c.contractValue ? Number(c.contractValue) : null,
    nextMeetingAt: c.nextMeetingAt?.toISOString() ?? null,
    notes: c.notes ?? null,
    customFields: c.customFields ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

function clientUpdateFields(body: Record<string, unknown>): string[] {
  const keys = [
    "salutation",
    "contactName",
    "companyName",
    "email",
    "phone",
    "status",
    "contractValue",
    "nextMeetingAt",
    "notes",
    "customFields",
  ];
  return keys.filter((key) => body[key] !== undefined);
}

router.get("/v1/clients", requireAuth, requirePermission("clients:read"), async (_req, res): Promise<void> => {
  const clients = await store.listClients();
  res.json(await Promise.all(clients.map(clientWithRelations)));
});

router.post("/v1/clients", requireAuth, requirePermission("clients:write"), async (req, res): Promise<void> => {
  const {
    salutation, contactName, companyName, email, phone, assignedTeamId,
    status, contractValue, nextMeetingAt, notes, customFields,
  } = req.body;

  const normalizedCompany = optionalText(companyName);
  if (!normalizedCompany) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  const normalizedEmail = optionalEmail(email);
  if (email != null && String(email).trim() && !normalizedEmail) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  const fields = sanitizeCustomFields(customFields);
  const client = await store.createClient({
    salutation: optionalText(salutation),
    contactName: optionalText(contactName),
    companyName: normalizedCompany,
    email: normalizedEmail,
    phone: optionalText(phone),
    assignedTeamId: assignedTeamId ?? null,
    status: status ?? "ACTIVE",
    contractValue: contractValue ? String(contractValue) : null,
    nextMeetingAt: nextMeetingAt ? new Date(nextMeetingAt) : null,
    notes: optionalText(notes),
    customFields: fields ?? null,
  });

  const team = client.assignedTeamId ? await store.findTeamById(client.assignedTeamId) : null;
  await logActivity(req.user!.userId, "added client", "client", client.id, {
    companyName: client.companyName,
    contactName: client.contactName,
    email: client.email,
    teamName: team?.name ?? null,
  });

  res.status(201).json(await clientWithRelations(client));
});

router.get("/v1/clients/:id", requireAuth, requirePermission("clients:read"), async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const client = await store.findClientById(id);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await clientWithRelations(client));
});

router.patch("/v1/clients/:id", requireAuth, requirePermission("clients:write"), async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const existing = await store.findClientById(id);
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const {
    salutation, contactName, companyName, email, phone, assignedTeamId,
    status, contractValue, nextMeetingAt, notes, customFields,
  } = req.body;

  if (companyName !== undefined && !optionalText(companyName)) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  if (email !== undefined && String(email).trim() && !optionalEmail(email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  const fields = sanitizeCustomFields(customFields);
  const client = await store.updateClient(id, {
    ...(salutation !== undefined && { salutation: optionalText(salutation) }),
    ...(contactName !== undefined && { contactName: optionalText(contactName) }),
    ...(companyName !== undefined && { companyName: optionalText(companyName)! }),
    ...(email !== undefined && { email: optionalEmail(email) }),
    ...(phone !== undefined && { phone: optionalText(phone) }),
    ...(assignedTeamId !== undefined && { assignedTeamId }),
    ...(status !== undefined && { status }),
    ...(contractValue !== undefined && { contractValue: contractValue != null ? String(contractValue) : null }),
    ...(nextMeetingAt !== undefined && { nextMeetingAt: nextMeetingAt ? new Date(nextMeetingAt) : null }),
    ...(notes !== undefined && { notes: optionalText(notes) }),
    ...(fields !== undefined && { customFields: fields }),
  });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  if (assignedTeamId !== undefined && assignedTeamId !== existing.assignedTeamId) {
    if (assignedTeamId == null) {
      const oldTeam = existing.assignedTeamId ? await store.findTeamById(existing.assignedTeamId) : null;
      await logActivity(req.user!.userId, "unassigned client from team", "client", id, {
        companyName: client.companyName,
        teamName: oldTeam?.name ?? null,
        teamId: existing.assignedTeamId,
      });
    } else {
      const newTeam = await store.findTeamById(assignedTeamId);
      await logActivity(req.user!.userId, "assigned client to team", "client", id, {
        companyName: client.companyName,
        teamName: newTeam?.name ?? null,
        teamId: assignedTeamId,
      });
    }
  }

  const updatedFields = clientUpdateFields(req.body);
  if (updatedFields.length > 0) {
    await logActivity(req.user!.userId, "updated client", "client", id, {
      companyName: client.companyName,
      fields: updatedFields,
    });
  }

  res.json(await clientWithRelations(client));
});

router.delete("/v1/clients/:id", requireAuth, requirePermission("clients:delete"), async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const existing = await store.findClientById(id);
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await logActivity(req.user!.userId, "deleted client", "client", id, {
    companyName: existing.companyName,
    contactName: existing.contactName,
  });

  await store.deleteClient(id);
  res.sendStatus(204);
});

export default router;
