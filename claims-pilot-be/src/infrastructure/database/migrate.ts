import { pool } from "./pool";
import { logger } from "../../config/logger";

const MIGRATIONS = [
  {
    name: "001_initial_schema",
    sql: `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'adjuster' CHECK (role IN ('admin', 'adjuster', 'investigator')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Claims table
      CREATE TABLE IF NOT EXISTS claims (
        id VARCHAR(20) PRIMARY KEY,
        customer_id VARCHAR(255),
        customer_name VARCHAR(255) NOT NULL,
        policy_number VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        region VARCHAR(100) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'FNOL',
        fraud_score NUMERIC(5, 2),
        confidence NUMERIC(5, 2),
        vehicle VARCHAR(200),
        description TEXT NOT NULL,
        assigned_agents TEXT[] DEFAULT '{}',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Evidence table
      CREATE TABLE IF NOT EXISTS evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id VARCHAR(20) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        file_name VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(200) NOT NULL,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('image', 'document', 'audio', 'video', 'geo', 'other')),
        storage_key VARCHAR(1000) NOT NULL,
        storage_url VARCHAR(2000) NOT NULL,
        findings JSONB,
        analysis_confidence NUMERIC(5, 4),
        uploaded_by UUID REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Investigations table
      CREATE TABLE IF NOT EXISTS investigations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id VARCHAR(20) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'queued',
        fraud_score NUMERIC(5, 2),
        confidence NUMERIC(5, 2),
        recommendation_action VARCHAR(500),
        recommendation_amount NUMERIC(12, 2),
        recommendation_reason TEXT,
        recommendation_tone VARCHAR(20),
        active_agents TEXT[] DEFAULT '{}',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      -- Agent events timeline
      CREATE TABLE IF NOT EXISTS agent_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
        claim_id VARCHAR(20) NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        agent VARCHAR(100) NOT NULL,
        color VARCHAR(20) NOT NULL,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('delegate', 'reason', 'evidence', 'debate', 'decision', 'escalate')),
        text TEXT NOT NULL,
        confidence NUMERIC(5, 4),
        target_agent VARCHAR(100),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Fraud nodes (graph)
      CREATE TABLE IF NOT EXISTS fraud_nodes (
        id VARCHAR(50) PRIMARY KEY,
        label VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('vendor', 'cluster', 'claim', 'adjuster')),
        risk_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Fraud edges (graph)
      CREATE TABLE IF NOT EXISTS fraud_edges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_node_id VARCHAR(50) NOT NULL REFERENCES fraud_nodes(id) ON DELETE CASCADE,
        target_node_id VARCHAR(50) NOT NULL REFERENCES fraud_nodes(id) ON DELETE CASCADE,
        relationship VARCHAR(100) NOT NULL DEFAULT 'linked',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Fraud alerts
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id VARCHAR(20) REFERENCES claims(id) ON DELETE SET NULL,
        node_id VARCHAR(50) REFERENCES fraud_nodes(id) ON DELETE SET NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
      CREATE INDEX IF NOT EXISTS idx_claims_region ON claims(region);
      CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_claims_fraud_score ON claims(fraud_score DESC);
      CREATE INDEX IF NOT EXISTS idx_evidence_claim_id ON evidence(claim_id);
      CREATE INDEX IF NOT EXISTS idx_investigations_claim_id ON investigations(claim_id);
      CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
      CREATE INDEX IF NOT EXISTS idx_agent_events_investigation_id ON agent_events(investigation_id);
      CREATE INDEX IF NOT EXISTS idx_agent_events_claim_id ON agent_events(claim_id);
      CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON agent_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON fraud_alerts(resolved);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

      -- Migrations tracking table
      CREATE TABLE IF NOT EXISTS migrations (
        name VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    name: "002_policy_documents",
    sql: `
      CREATE TABLE IF NOT EXISTS policy_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(500) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(200) NOT NULL,
        storage_key VARCHAR(1000) NOT NULL,
        description TEXT,
        extracted_text TEXT,
        uploaded_by UUID REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_policy_documents_uploaded_at ON policy_documents(uploaded_at DESC);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Ensure migrations table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        name VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of MIGRATIONS) {
      const { rows } = await client.query(
        "SELECT name FROM migrations WHERE name = $1",
        [migration.name]
      );
      if (rows.length === 0) {
        logger.info(`Running migration: ${migration.name}`);
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO migrations (name) VALUES ($1)",
          [migration.name]
        );
        logger.info(`Migration ${migration.name} applied successfully`);
      } else {
        logger.info(`Migration ${migration.name} already applied, skipping`);
      }
    }
  } finally {
    client.release();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("All migrations complete");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Migration failed", err);
      process.exit(1);
    });
}
