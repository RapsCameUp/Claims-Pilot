export type FraudNodeType = "vendor" | "cluster" | "claim" | "adjuster";

export interface FraudNode {
  id: string;
  label: string;
  type: FraudNodeType;
  riskScore: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface FraudEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
  createdAt: Date;
}

export interface FraudAlert {
  id: string;
  claimId: string | null;
  nodeId: string | null;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  resolved: boolean;
  createdAt: Date;
}
