export type ClaimStatus =
  | "FNOL"
  | "Investigation"
  | "Fraud Review"
  | "Policy Validation"
  | "Settlement Review"
  | "Escalated"
  | "Closed";

export type ClaimType =
  | "Auto Collision"
  | "Theft"
  | "Property Damage"
  | "Hail Storm"
  | "Liability"
  | "Medical"
  | "Windscreen";

export interface Claim {
  id: string;
  customerId: string;
  customerName: string;
  policyNumber: string;
  type: ClaimType;
  region: string;
  amount: number;
  status: ClaimStatus;
  fraudScore: number | null;
  confidence: number | null;
  vehicle: string | null;
  description: string;
  assignedAgents: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
