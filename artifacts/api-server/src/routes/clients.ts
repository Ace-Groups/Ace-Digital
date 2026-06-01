import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, teamsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function clientWithRelations(c: typeof clientsTable.$inferSelect) {
  const team = c.assignedTeamId
    ? (await db.select().from(teamsTable).where(eq(teamsTable.id, c.assignedTeamId)))[0]
    : null;
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

router.get("/v1/clients", requireAuth, async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable).orderBy(sql`${clientsTable.createdAt} DESC`);
  const result = await Promise.all(clients.map(clientWithRelations));
  res.json(result);
});

router.post("/v1/clients", requireAuth, async (req, res): Promise<void> => {
  const { contactName, companyName, email, phone, assignedTeamId, status, contractValue, nextMeetingAt } = req.body;
  if (!contactName || !companyName || !email) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [client] = await db.insert(clientsTable).values({
    contactName,
    companyName,
    email,
    phone: phone ?? null,
    assignedTeamId: assignedTeamId ?? null,
    status: status ?? "ACTIVE",
    contractValue: contractValue ? String(contractValue) : null,
    nextMeetingAt: nextMeetingAt ? new Date(nextMeetingAt) : null,
  }).returning();
  res.status(201).json(await clientWithRelations(client));
});

router.get("/v1/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await clientWithRelations(client));
});

router.patch("/v1/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const { contactName, companyName, email, phone, assignedTeamId, status, contractValue, nextMeetingAt } = req.body;
  const [client] = await db.update(clientsTable).set({
    ...(contactName !== undefined && { contactName }),
    ...(companyName !== undefined && { companyName }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(assignedTeamId !== undefined && { assignedTeamId }),
    ...(status !== undefined && { status }),
    ...(contractValue !== undefined && { contractValue: String(contractValue) }),
    ...(nextMeetingAt !== undefined && { nextMeetingAt: new Date(nextMeetingAt) }),
  }).where(eq(clientsTable.id, id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await clientWithRelations(client));
});

router.delete("/v1/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  await db.delete(clientsTable).where(eq(clientsTable.id, id));
  res.sendStatus(204);
});

export default router;
