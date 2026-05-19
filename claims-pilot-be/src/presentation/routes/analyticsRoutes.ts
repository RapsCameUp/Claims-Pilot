import { Router, Response } from "express";
import { AnalyticsService } from "../../application/services/AnalyticsService";
import { AuthRequest, authenticate } from "../middleware/auth";

export function createAnalyticsRouter(analyticsService: AnalyticsService): Router {
  const router = Router();

  /**
   * @swagger
   * /api/analytics/dashboard:
   *   get:
   *     summary: Get dashboard KPIs
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Dashboard KPIs }
   */
  router.get("/dashboard", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const kpis = await analyticsService.getDashboardKPIs();
      res.json(kpis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/analytics/settlement-trend:
   *   get:
   *     summary: Get settlement trend data
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: days
   *         schema: { type: integer, default: 14 }
   *     responses:
   *       200: { description: Settlement trend }
   */
  router.get("/settlement-trend", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 14;
      const trend = await analyticsService.getSettlementTrend(days);
      res.json(trend);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/analytics/fraud-trend:
   *   get:
   *     summary: Get fraud detection trend data
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: months
   *         schema: { type: integer, default: 12 }
   *     responses:
   *       200: { description: Fraud trend }
   */
  router.get("/fraud-trend", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const months = req.query.months ? parseInt(req.query.months as string) : 12;
      const trend = await analyticsService.getFraudTrend(months);
      res.json(trend);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/analytics/region-heatmap:
   *   get:
   *     summary: Get claims heatmap by region
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Region heatmap data }
   */
  router.get("/region-heatmap", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const heatmap = await analyticsService.getRegionHeatmap();
      res.json(heatmap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/analytics/agent-performance:
   *   get:
   *     summary: Get agent performance metrics
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Agent performance stats }
   */
  router.get("/agent-performance", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const performance = await analyticsService.getAgentPerformance();
      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
