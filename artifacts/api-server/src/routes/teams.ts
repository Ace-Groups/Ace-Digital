import { Router } from "express";
import { store } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/v1/teams", requireAuth, async (_req, res): Promise<void> => {
  const teams = await store.listTeams();
  const result = await Promise.all(
    teams.map(async (t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      memberCount: await store.countUsersByTeam(t.id),
    })),
  );
  res.json(result);
});

router.get("/v1/teams/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const members = await store.listUsers({ teamId: id });
  const team = await store.findTeamById(id);

  const result = await Promise.all(
    members.map(async (m) => {
      const profile = await store.findProfileByUserId(m.id);
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        role: m.role,
        teamId: m.teamId,
        teamName: team?.name ?? null,
        jobTitle: m.jobTitle,
        avatarUrl: m.avatarUrl,
        status: m.status,
        baseSalary: profile?.baseSalary ? Number(profile.baseSalary) : null,
        bonus: profile?.bonus ? Number(profile.bonus) : null,
        payrollStatus: profile?.payrollStatus,
        createdAt: m.createdAt.toISOString(),
      };
    }),
  );

  res.json(result);
});

export default router;
