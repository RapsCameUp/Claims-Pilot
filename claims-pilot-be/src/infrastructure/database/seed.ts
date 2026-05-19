import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { runMigrations } from "./migrate";
import { logger } from "../../config/logger";

async function seed(): Promise<void> {
  await runMigrations();

  const client = await pool.connect();
  try {
    // Seed default admin user
    const { rows: existing } = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ["aisha@gmail.com"]
    );

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash("Password@20", 12);
      await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        ["aisha@gmail.com", passwordHash, "Aisha", "Admin", "admin"]
      );
      logger.info("Default admin user seeded: aisha@gmail.com");
    } else {
      logger.info("Admin user already exists, skipping seed");
    }

    // Seed sample fraud network nodes
    const fraudNodes = [
      { id: "V-2241", label: "Vendor V-2241", type: "vendor", risk_score: 0.92 },
      { id: "C-118", label: "Cluster CL-118", type: "cluster", risk_score: 0.88 },
      { id: "REP-Sandton", label: "RepairShop SDX", type: "vendor", risk_score: 0.81 },
      { id: "ADJ-44", label: "Adjuster ADJ-44", type: "adjuster", risk_score: 0.55 },
    ];

    for (const node of fraudNodes) {
      await client.query(
        `INSERT INTO fraud_nodes (id, label, type, risk_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [node.id, node.label, node.type, node.risk_score]
      );
    }

    // Seed fraud edges
    const fraudEdges = [
      ["V-2241", "C-118", "supplies"],
      ["V-2241", "REP-Sandton", "partnership"],
    ];

    for (const [source, target, rel] of fraudEdges) {
      await client.query(
        `INSERT INTO fraud_edges (source_node_id, target_node_id, relationship)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM fraud_edges WHERE source_node_id = $1 AND target_node_id = $2
         )`,
        [source, target, rel]
      );
    }

    logger.info("Seed data applied successfully");
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("Seed failed", err);
    process.exit(1);
  });
