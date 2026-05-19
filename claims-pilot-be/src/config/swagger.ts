import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ClaimPilot AI — Backend API",
      version: "1.0.0",
      description:
        "Enterprise-grade autonomous claims intelligence & fraud investigation platform. " +
        "Multi-agent AI workflows powered by Google Gemini, PostgreSQL persistence, " +
        "and Vultr Object Storage for evidence management.",
      contact: {
        name: "ClaimPilot Team",
      },
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token obtained from /api/auth/login",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication & user management" },
      { name: "Claims", description: "Claims CRUD and evidence management" },
      { name: "Evidence", description: "Evidence file upload and retrieval" },
      { name: "Investigations", description: "Autonomous AI-driven investigation workflows" },
      { name: "Timeline", description: "Agent event timelines and activity feeds" },
      { name: "Activity", description: "Real-time agent activity stream" },
      { name: "Fraud", description: "Fraud intelligence graph and alerts" },
      { name: "Analytics", description: "Dashboard KPIs, trends, and heatmaps" },
      { name: "Audit", description: "Audit logging and compliance trail" },
    ],
  },
  apis: ["./src/presentation/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
