import { Router } from "express";
import { ID_CARD_TEMPLATE_VERSION } from "../lib/id-card/template-version";

const router = Router();

router.get("/v1/meta", (_req, res) => {
  res.json({
    idCardTemplate: ID_CARD_TEMPLATE_VERSION,
    verifyPathPattern: "/v/verification/{employeeCode}",
  });
});

export default router;
