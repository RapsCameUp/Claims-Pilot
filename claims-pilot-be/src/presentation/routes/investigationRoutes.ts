import { Router, Request, Response } from "express";
import { InvestigationService } from "../../application/services/InvestigationService";
import { AuthRequest, authenticate } from "../middleware/auth";
import jwt from "jsonwebtoken";
import { config } from "../../config";

export function createInvestigationRouter(investigationService: InvestigationService): Router {
  const router = Router();

  /**
   * @swagger
   * /api/investigations:
   *   get:
   *     summary: List all investigations
   *     tags: [Investigations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *       - in: query
   *         name: limit
   *         schema: { type: integer }
   *       - in: query
   *         name: offset
   *         schema: { type: integer }
   *     responses:
   *       200: { description: List of investigations }
   */
  router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      const investigations = await investigationService.listInvestigations(filters);
      res.json(investigations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/{id}:
   *   get:
   *     summary: Get investigation detail with events timeline
   *     tags: [Investigations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Investigation with events }
   *       404: { description: Not found }
   */
  router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const investigation = await investigationService.getInvestigation(req.params.id);
      res.json(investigation);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/claim/{claimId}:
   *   get:
   *     summary: Get investigation for a specific claim
   *     tags: [Investigations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: claimId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Investigation with events }
   *       404: { description: Not found }
   */
  router.get("/claim/:claimId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const investigation = await investigationService.getInvestigationByClaimId(req.params.claimId);
      res.json(investigation);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/start/{claimId}:
   *   post:
   *     summary: Start an autonomous investigation for a claim
   *     tags: [Investigations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: claimId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       201: { description: Investigation created and agents dispatched }
   *       400: { description: Investigation already in progress }
   */
  router.post("/start/:claimId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const investigation = await investigationService.startInvestigation(
        req.params.claimId, req.user!.userId, req.ip || undefined
      );
      res.status(201).json(investigation);
    } catch (error: any) {
      const status = error.message.includes("already") ? 409 : 400;
      res.status(status).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/timeline/{claimId}:
   *   get:
   *     summary: Get agent events timeline for a claim
   *     tags: [Investigations, Timeline]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: claimId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Agent events timeline }
   */
  router.get("/timeline/:claimId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const timeline = await investigationService.getTimeline(req.params.claimId);
      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/activity/recent:
   *   get:
   *     summary: Get recent agent activity feed
   *     tags: [Investigations, Activity]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Recent agent events }
   */
  router.get("/activity/recent", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activity = await investigationService.getRecentActivity(limit);
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/investigations/{id}/stream:
   *   get:
   *     summary: SSE stream of live investigation events
   *     tags: [Investigations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: token
   *         schema: { type: string }
   *     responses:
   *       200: { description: SSE event stream }
   */
  router.get("/:id/stream", (req: Request, res: Response) => {
    // Accept token from query param (EventSource doesn't support headers)
    const token = (req.query.token as string) || req.headers.authorization?.substring(7);
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    try {
      jwt.verify(token, config.jwt.secret);
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    investigationService.registerSSEClient(req.params.id, res);

    // Keep alive every 30s
    const keepAlive = setInterval(() => {
      try { res.write(": keepalive\n\n"); } catch { clearInterval(keepAlive); }
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });
  });

  return router;
}
