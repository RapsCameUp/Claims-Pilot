import { Router, Response } from "express";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";
import { AuthRequest, authenticate, authorize } from "../middleware/auth";

export function createAuditRouter(auditRepo: IAuditLogRepository): Router {
  const router = Router();

  /**
   * @swagger
   * /api/audit:
   *   get:
   *     summary: List audit logs (admin only)
   *     tags: [Audit]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 100 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *     responses:
   *       200: { description: Audit log entries }
   *       403: { description: Forbidden }
   */
  router.get("/", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const logs = await auditRepo.list(limit, offset);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/audit/entity/{entityType}/{entityId}:
   *   get:
   *     summary: Get audit trail for a specific entity
   *     tags: [Audit]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: entityType
   *         required: true
   *         schema: { type: string }
   *       - in: path
   *         name: entityId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Audit log entries for entity }
   */
  router.get("/entity/:entityType/:entityId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const logs = await auditRepo.findByEntity(req.params.entityType, req.params.entityId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/audit/user/{userId}:
   *   get:
   *     summary: Get audit trail for a specific user
   *     tags: [Audit]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Audit log entries for user }
   */
  router.get("/user/:userId", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await auditRepo.findByUser(req.params.userId, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
