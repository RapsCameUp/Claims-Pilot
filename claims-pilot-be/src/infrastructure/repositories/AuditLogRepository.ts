import { pool } from "../database/pool";
import { AuditLog } from "../../domain/entities/AuditLog";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";

export class AuditLogRepository implements IAuditLogRepository {
  async create(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    const { rows } = await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [log.userId, log.action, log.entityType, log.entityId,
       log.details ? JSON.stringify(log.details) : null, log.ipAddress]
    );
    return this.mapRow(rows[0]);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const { rows } = await pool.query(
      "SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY timestamp DESC",
      [entityType, entityId]
    );
    return rows.map(this.mapRow);
  }

  async findByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const { rows } = await pool.query(
      "SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2",
      [userId, limit]
    );
    return rows.map(this.mapRow);
  }

  async list(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const { rows } = await pool.query(
      "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: any): AuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      ipAddress: row.ip_address,
      timestamp: row.timestamp,
    };
  }
}
