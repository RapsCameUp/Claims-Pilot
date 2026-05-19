import { Router, Response } from "express";
import { IFraudRepository } from "../../domain/repositories/IFraudRepository";
import { AuthRequest, authenticate } from "../middleware/auth";

export function createFraudRouter(fraudRepo: IFraudRepository): Router {
  const router = Router();

  /**
   * @swagger
   * /api/fraud/graph:
   *   get:
   *     summary: Get fraud network graph (nodes + edges)
   *     tags: [Fraud]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Fraud network graph }
   */
  router.get("/graph", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const [nodes, edges] = await Promise.all([
        fraudRepo.getNodes(),
        fraudRepo.getEdges(),
      ]);
      res.json({ nodes, edges });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/fraud/alerts:
   *   get:
   *     summary: List fraud alerts
   *     tags: [Fraud]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: resolved
   *         schema: { type: boolean }
   *       - in: query
   *         name: severity
   *         schema: { type: string, enum: [low, medium, high, critical] }
   *       - in: query
   *         name: limit
   *         schema: { type: integer }
   *     responses:
   *       200: { description: List of fraud alerts }
   */
  router.get("/alerts", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const filters = {
        resolved: req.query.resolved !== undefined ? req.query.resolved === "true" : undefined,
        severity: req.query.severity as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };
      const alerts = await fraudRepo.getAlerts(filters);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/fraud/alerts/{id}/resolve:
   *   patch:
   *     summary: Resolve a fraud alert
   *     tags: [Fraud]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Resolved alert }
   */
  router.patch("/alerts/:id/resolve", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const alert = await fraudRepo.resolveAlert(req.params.id);
      res.json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/fraud/nodes:
   *   get:
   *     summary: Get all fraud network nodes
   *     tags: [Fraud]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Fraud network nodes }
   */
  router.get("/nodes", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const nodes = await fraudRepo.getNodes();
      res.json(nodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/fraud/edges:
   *   get:
   *     summary: Get all fraud network edges
   *     tags: [Fraud]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Fraud network edges }
   */
  router.get("/edges", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const edges = await fraudRepo.getEdges();
      res.json(edges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
