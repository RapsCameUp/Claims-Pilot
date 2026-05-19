import { Evidence } from "../entities/Evidence";

export interface IEvidenceRepository {
  findById(id: string): Promise<Evidence | null>;
  findByClaimId(claimId: string): Promise<Evidence[]>;
  create(evidence: Omit<Evidence, "id" | "uploadedAt">): Promise<Evidence>;
  updateFindings(id: string, findings: string[], confidence: number): Promise<Evidence>;
  delete(id: string): Promise<void>;
}
