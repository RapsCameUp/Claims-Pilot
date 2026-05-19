import { pool } from "../database/pool";
import { FraudNode, FraudEdge, FraudAlert } from "../../domain/entities/Fraud";
import { IFraudRepository } from "../../domain/repositories/IFraudRepository";

export class FraudRepository implements IFraudRepository {
  async createNode(node: Omit<FraudNode, "id" | "createdAt"> & { id?: string }): Promise<FraudNode> {
    const id = (node as any).id || `N-${Date.now()}`;
    const { rows } = await pool.query(
      `INSERT INTO fraud_nodes (id, label, type, risk_score, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET risk_score = $4, metadata = $5
       RETURNING *`,
      [id, node.label, node.type, node.riskScore, node.metadata ? JSON.stringify(node.metadata) : null]
    );
    return this.mapNode(rows[0]);
  }

  async getNodes(): Promise<FraudNode[]> {
    const { rows } = await pool.query("SELECT * FROM fraud_nodes ORDER BY risk_score DESC");
    return rows.map(this.mapNode);
  }

  async getNodeById(id: string): Promise<FraudNode | null> {
    const { rows } = await pool.query("SELECT * FROM fraud_nodes WHERE id = $1", [id]);
    return rows.length ? this.mapNode(rows[0]) : null;
  }

  async createEdge(edge: Omit<FraudEdge, "id" | "createdAt">): Promise<FraudEdge> {
    const { rows } = await pool.query(
      `INSERT INTO fraud_edges (source_node_id, target_node_id, relationship)
       VALUES ($1, $2, $3) RETURNING *`,
      [edge.sourceNodeId, edge.targetNodeId, edge.relationship]
    );
    return this.mapEdge(rows[0]);
  }

  async getEdges(): Promise<FraudEdge[]> {
    const { rows } = await pool.query("SELECT * FROM fraud_edges");
    return rows.map(this.mapEdge);
  }

  async createAlert(alert: Omit<FraudAlert, "id" | "createdAt">): Promise<FraudAlert> {
    const { rows } = await pool.query(
      `INSERT INTO fraud_alerts (claim_id, node_id, severity, title, description, resolved)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [alert.claimId, alert.nodeId, alert.severity, alert.title, alert.description, alert.resolved]
    );
    return this.mapAlert(rows[0]);
  }

  async getAlerts(filters?: { resolved?: boolean; severity?: string; limit?: number }): Promise<FraudAlert[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.resolved !== undefined) { conditions.push(`resolved = $${idx++}`); values.push(filters.resolved); }
    if (filters?.severity) { conditions.push(`severity = $${idx++}`); values.push(filters.severity); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit || 50;

    const { rows } = await pool.query(
      `SELECT * FROM fraud_alerts ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...values, limit]
    );
    return rows.map(this.mapAlert);
  }

  async resolveAlert(id: string): Promise<FraudAlert> {
    const { rows } = await pool.query(
      "UPDATE fraud_alerts SET resolved = TRUE WHERE id = $1 RETURNING *",
      [id]
    );
    return this.mapAlert(rows[0]);
  }

  async getAlertCount(resolved?: boolean): Promise<number> {
    const condition = resolved !== undefined ? "WHERE resolved = $1" : "";
    const values = resolved !== undefined ? [resolved] : [];
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM fraud_alerts ${condition}`, values);
    return parseInt(rows[0].count, 10);
  }

  private mapNode(row: any): FraudNode {
    return {
      id: row.id,
      label: row.label,
      type: row.type,
      riskScore: parseFloat(row.risk_score),
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }

  private mapEdge(row: any): FraudEdge {
    return {
      id: row.id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      relationship: row.relationship,
      createdAt: row.created_at,
    };
  }

  private mapAlert(row: any): FraudAlert {
    return {
      id: row.id,
      claimId: row.claim_id,
      nodeId: row.node_id,
      severity: row.severity,
      title: row.title,
      description: row.description,
      resolved: row.resolved,
      createdAt: row.created_at,
    };
  }
}
