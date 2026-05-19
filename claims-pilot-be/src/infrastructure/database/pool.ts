import { Pool } from "pg";
import { config } from "../../config";
import { logger } from "../../config/logger";

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  logger.error("Unexpected database pool error", err);
});

export async function testConnection(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT NOW()");
        logger.info("Database connection established");
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`Database connection attempt ${attempt}/${retries} failed, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
