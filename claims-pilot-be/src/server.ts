import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { config } from "./config";
import { logger } from "./config/logger";
import { swaggerSpec } from "./config/swagger";
import { testConnection } from "./infrastructure/database/pool";
import { runMigrations } from "./infrastructure/database/migrate";

// Repositories
import { UserRepository } from "./infrastructure/repositories/UserRepository";
import { ClaimRepository } from "./infrastructure/repositories/ClaimRepository";
import { EvidenceRepository } from "./infrastructure/repositories/EvidenceRepository";
import { InvestigationRepository } from "./infrastructure/repositories/InvestigationRepository";
import { AgentEventRepository } from "./infrastructure/repositories/AgentEventRepository";
import { FraudRepository } from "./infrastructure/repositories/FraudRepository";
import { AuditLogRepository } from "./infrastructure/repositories/AuditLogRepository";
import { PolicyDocumentRepository } from "./infrastructure/repositories/PolicyDocumentRepository";

// Services
import { ObjectStorageService } from "./infrastructure/storage/ObjectStorageService";
import { GeminiService } from "./infrastructure/ai/GeminiService";
import { AuthService } from "./application/services/AuthService";
import { ClaimService } from "./application/services/ClaimService";
import { InvestigationService } from "./application/services/InvestigationService";
import { AnalyticsService } from "./application/services/AnalyticsService";

// Routes
import { createAuthRouter } from "./presentation/routes/authRoutes";
import { createClaimRouter } from "./presentation/routes/claimRoutes";
import { createInvestigationRouter } from "./presentation/routes/investigationRoutes";
import { createFraudRouter } from "./presentation/routes/fraudRoutes";
import { createAnalyticsRouter } from "./presentation/routes/analyticsRoutes";
import { createAuditRouter } from "./presentation/routes/auditRoutes";
import { createPolicyDocRouter } from "./presentation/routes/policyDocRoutes";

// Middleware
import { errorHandler } from "./presentation/middleware/errorHandler";

// Seed
import bcrypt from "bcryptjs";
import { pool } from "./infrastructure/database/pool";

async function seedDefaultAdmin() {
  const userRepo = new UserRepository();
  const existing = await userRepo.findByEmail("aisha@gmail.com");
  if (!existing) {
    const passwordHash = await bcrypt.hash("Password@20", 12);
    await userRepo.create({
      email: "aisha@gmail.com",
      passwordHash,
      firstName: "Aisha",
      lastName: "Admin",
      role: "admin",
    });
    logger.info("Default admin user seeded: aisha@gmail.com");
  }
}

async function bootstrap() {
  // ── Database ──
  await testConnection();
  await runMigrations();
  await seedDefaultAdmin();

  // ── Dependency Injection ──
  const userRepo = new UserRepository();
  const claimRepo = new ClaimRepository();
  const evidenceRepo = new EvidenceRepository();
  const investigationRepo = new InvestigationRepository();
  const agentEventRepo = new AgentEventRepository();
  const fraudRepo = new FraudRepository();
  const auditRepo = new AuditLogRepository();
  const policyDocRepo = new PolicyDocumentRepository();

  const storageService = new ObjectStorageService();
  await storageService.ensureBucket();
  const geminiService = new GeminiService();

  const authService = new AuthService(userRepo, auditRepo);
  const claimService = new ClaimService(claimRepo, evidenceRepo, auditRepo, storageService);
  const investigationService = new InvestigationService(
    investigationRepo, agentEventRepo, claimRepo, evidenceRepo, fraudRepo, auditRepo, geminiService, policyDocRepo, storageService
  );
  const analyticsService = new AnalyticsService(claimRepo, investigationRepo, fraudRepo, agentEventRepo);

  // ── Express App ──
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Too many requests, please try again later" },
  });
  app.use("/api/", limiter);

  // Auth rate limiting (stricter)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many auth attempts, please try again later" },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // ── Swagger ──
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "ClaimPilot AI — API Documentation",
  }));
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

  // ── Routes ──
  app.use("/api/auth", createAuthRouter(authService));
  app.use("/api/claims", createClaimRouter(claimService));
  app.use("/api/investigations", createInvestigationRouter(investigationService));
  app.use("/api/fraud", createFraudRouter(fraudRepo));
  app.use("/api/analytics", createAnalyticsRouter(analyticsService));
  app.use("/api/audit", createAuditRouter(auditRepo));
  app.use("/api/policy-documents", createPolicyDocRouter(policyDocRepo, storageService, geminiService));

  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "healthy", timestamp: new Date().toISOString(), version: "1.0.0" });
    } catch {
      res.status(503).json({ status: "unhealthy", timestamp: new Date().toISOString() });
    }
  });

  // Root
  app.get("/", (_req, res) => {
    res.json({
      name: "ClaimPilot AI Backend",
      version: "1.0.0",
      docs: "/api/docs",
      health: "/api/health",
    });
  });

  // Error handler
  app.use(errorHandler);

  // ── Start ──
  app.listen(config.port, () => {
    logger.info(`ClaimPilot AI backend running on port ${config.port}`);
    logger.info(`API docs: http://localhost:${config.port}/api/docs`);
    logger.info(`Health: http://localhost:${config.port}/api/health`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
