import { FraudNode, FraudEdge, FraudAlert } from "../entities/Fraud";

export interface IFraudRepository {
  // Nodes
  createNode(node: Omit<FraudNode, "id" | "createdAt">): Promise<FraudNode>;
  getNodes(): Promise<FraudNode[]>;
  getNodeById(id: string): Promise<FraudNode | null>;

  // Edges
  createEdge(edge: Omit<FraudEdge, "id" | "createdAt">): Promise<FraudEdge>;
  getEdges(): Promise<FraudEdge[]>;

  // Alerts
  createAlert(alert: Omit<FraudAlert, "id" | "createdAt">): Promise<FraudAlert>;
  getAlerts(filters?: { resolved?: boolean; severity?: string; limit?: number }): Promise<FraudAlert[]>;
  resolveAlert(id: string): Promise<FraudAlert>;
  getAlertCount(resolved?: boolean): Promise<number>;
}
