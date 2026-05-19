import { AuditLog } from "../entities/AuditLog";

export interface IAuditLogRepository {
  create(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>;
  list(limit?: number, offset?: number): Promise<AuditLog[]>;
}
