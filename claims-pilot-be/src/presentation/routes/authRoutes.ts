import { Router, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../application/services/AuthService";
import { AuthRequest, authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, "Password must contain uppercase, number, and special character"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["admin", "adjuster", "investigator"]).optional(),
});

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login with email and password
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 6 }
   *     responses:
   *       200: { description: JWT token and user profile }
   *       401: { description: Invalid credentials }
   */
  router.post("/login", validate(loginSchema), async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.login(req.body, req.ip || undefined);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, firstName, lastName]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               firstName: { type: string }
   *               lastName: { type: string }
   *               role: { type: string, enum: [admin, adjuster, investigator] }
   *     responses:
   *       201: { description: JWT token and user profile }
   *       409: { description: Email already registered }
   */
  router.post("/register", validate(registerSchema), async (req: AuthRequest, res: Response) => {
    try {
      const result = await authService.register(req.body, req.ip || undefined);
      res.status(201).json(result);
    } catch (error: any) {
      const status = error.message.includes("already") ? 409 : 400;
      res.status(status).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user profile
   *     tags: [Auth]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: User profile }
   *       401: { description: Unauthorized }
   */
  router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      res.json(profile);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
}
