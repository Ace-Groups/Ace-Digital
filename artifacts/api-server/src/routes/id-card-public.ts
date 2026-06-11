import { Router } from "express";
import rateLimit from "express-rate-limit";
import { findUserByEmployeeCode, normalizeEmployeeCode } from "../lib/credentials/employee-code";
import { getIdCardAssetsByCode } from "../lib/id-card/id-card-store";
import { resolveIdCardExtras } from "../lib/id-card/resolve-extras";
import { publishIdCardForUser } from "../lib/id-card/publish-id-card";
import { svgToPngBytes } from "../lib/credentials/pdf-from-svg";

const router = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
});

const CARD_FILES = new Set(["front.png", "back.png", "id-card.pdf"]);

router.get(
  "/v1/public/id-cards/:employeeCode/:fileName",
  limiter,
  async (req, res): Promise<void> => {
    const employeeCode = normalizeEmployeeCode(String(req.params.employeeCode));
    const fileName = String(req.params.fileName);
    if (!CARD_FILES.has(fileName)) {
      res.status(404).end();
      return;
    }

    const stored = await getIdCardAssetsByCode(employeeCode);
    const cloudUrl =
      fileName === "front.png"
        ? stored?.frontPngUrl
        : fileName === "back.png"
          ? stored?.backPngUrl
          : stored?.pdfUrl;

    if (cloudUrl?.includes("storage.googleapis.com")) {
      res.redirect(302, cloudUrl);
      return;
    }

    const user = await findUserByEmployeeCode(employeeCode);
    if (!user) {
      res.status(404).end();
      return;
    }
    const resolved = await resolveIdCardExtras(user.id);
    if (!resolved) {
      res.status(404).end();
      return;
    }

    const { pair, pdfBytes } = await publishIdCardForUser(resolved.user, resolved.extras);

    if (fileName === "id-card.pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${employeeCode}-id-card.pdf"`,
      );
      res.send(Buffer.from(pdfBytes));
      return;
    }

    const svg = fileName === "front.png" ? pair.frontSvg : pair.backSvg;
    const png = await svgToPngBytes(svg, 540);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(png));
  },
);

export default router;
