import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { ClaimService } from "../../application/services/ClaimService";
import { AuthRequest, authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const createClaimSchema = z.object({
  customerName: z.string().min(1).max(255),
  policyNumber: z.string().min(1).max(100),
  type: z.enum(["Auto Collision", "Theft", "Property Damage", "Hail Storm", "Liability", "Medical", "Windscreen"]),
  region: z.string().min(1).max(100),
  amount: z.number().positive(),
  vehicle: z.string().max(200).optional(),
  description: z.string().min(10),
});

export function createClaimRouter(claimService: ClaimService): Router {
  const router = Router();

  /**
   * @swagger
   * /api/claims:
   *   get:
   *     summary: List all claims with optional filters
   *     tags: [Claims]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *       - in: query
   *         name: region
   *         schema: { type: string }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 50 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *     responses:
   *       200: { description: Paginated list of claims }
   */
  router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        status: req.query.status as any,
        region: req.query.region as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      const result = await claimService.listClaims(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/claims/{id}:
   *   get:
   *     summary: Get claim detail with evidence
   *     tags: [Claims]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Claim detail }
   *       404: { description: Not found }
   */
  router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const claim = await claimService.getClaim(req.params.id);
      res.json(claim);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/claims:
   *   post:
   *     summary: Create a new claim
   *     tags: [Claims]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [customerName, policyNumber, type, region, amount, description]
   *             properties:
   *               customerName: { type: string }
   *               policyNumber: { type: string }
   *               type: { type: string }
   *               region: { type: string }
   *               amount: { type: number }
   *               vehicle: { type: string }
   *               description: { type: string }
   *     responses:
   *       201: { description: Created claim }
   */
  router.post("/", authenticate, validate(createClaimSchema), async (req: AuthRequest, res: Response) => {
    try {
      const claim = await claimService.createClaim(req.body, req.user!.userId, req.ip || undefined);
      res.status(201).json(claim);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/claims/{id}/status:
   *   patch:
   *     summary: Update claim status
   *     tags: [Claims]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string }
   *     responses:
   *       200: { description: Updated claim }
   */
  router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const claim = await claimService.updateClaimStatus(
        req.params.id, req.body.status, req.user!.userId, req.ip || undefined
      );
      res.json(claim);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/claims/{id}/evidence:
   *   post:
   *     summary: Upload evidence file(s) for a claim
   *     tags: [Claims, Evidence]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               files:
   *                 type: array
   *                 items: { type: string, format: binary }
   *     responses:
   *       201: { description: Uploaded evidence records }
   */
  router.post("/:id/evidence", authenticate, upload.array("files", 20), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const results = [];
      for (const file of files) {
        const evidence = await claimService.uploadEvidence(
          req.params.id,
          { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
          req.user!.userId,
          req.ip || undefined
        );
        results.push(evidence);
      }

      res.status(201).json(results);
    } catch (error: any) {
      console.error("Evidence upload error:", error);
      res.status(400).json({ error: error.message || "Upload failed" });
    }
  });

  /**
   * @swagger
   * /api/claims/{claimId}/evidence/{evidenceId}/url:
   *   get:
   *     summary: Get a signed URL for evidence file download
   *     tags: [Evidence]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Signed URL }
   */
  router.get("/:claimId/evidence/:evidenceId/url", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const url = await claimService.getEvidenceSignedUrl(req.params.evidenceId);
      res.json({ url });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/claims/stats/status:
   *   get:
   *     summary: Get claim counts grouped by status
   *     tags: [Claims, Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Status counts }
   */
  router.get("/stats/status", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const counts = await claimService.getStatusCounts();
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
