import { Router } from "express";
import { store } from "@workspace/db";
import type { Client } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac-middleware";

const router = Router();

async function clientWithRelations(c: Client) {
  const team = c.assignedTeamId ? await store.findTeamById(c.assignedTeamId) : null;
  return {
    id: c.id,
    contactName: c.contactName,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
    assignedTeamId: c.assignedTeamId,
    assignedTeamName: team?.name ?? null,
    status: c.status,
    contractValue: c.contractValue ? Number(c.contractValue) : null,
    nextMeetingAt: c.nextMeetingAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/v1/clients", requireAuth, requirePermission("clients:read"), async (_req, res): Promise<void> => {
  const clients = await store.listClients();
  res.json(await Promise.all(clients.map(clientWithRelations)));
});

router.post("/v1/clients", requireAuth, requirePermission("clients:write"), async (req, res): Promise<void> => {
  const { contactName, companyName, email, phone, assignedTeamId, status, contractValue, nextMeetingAt } =
    req.body;
  if (!contactName || !companyName || !email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const client = await store.createClient({
    contactName,
    companyName,
    email,
    phone: phone ?? null,
    assignedTeamId: assignedTeamId ?? null,
    status: status ?? "ACTIVE",
    contractValue: contractValue ? String(contractValue) : null,
    nextMeetingAt: nextMeetingAt ? new Date(nextMeetingAt) : null,
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
  const { contactName, companyName, email, phone, assignedTeamId, status, contractValue, nextMeetingAt } =
    req.body;
  const client = await store.updateClient(id, {
    ...(contactName !== undefined && { contactName }),
    ...(companyName !== undefined && { companyName }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(assignedTeamId !== undefined && { assignedTeamId }),
    ...(status !== undefined && { status }),
    ...(contractValue !== undefined && { contractValue: String(contractValue) }),
    ...(nextMeetingAt !== undefined && { nextMeetingAt: new Date(nextMeetingAt) }),
  });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await clientWithRelations(client));
});

router.delete("/v1/clients/:id", requireAuth, requirePermission("clients:delete"), async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await store.deleteClient(id);
  res.sendStatus(204);
});

export default router;
