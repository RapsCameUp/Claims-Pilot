import { Claim, ClaimStatus } from "../entities/Claim";

export interface IClaimRepository {
  findById(id: string): Promise<Claim | null>;
  list(filters?: { status?: ClaimStatus; region?: string; limit?: number; offset?: number }): Promise<Claim[]>;
  count(filters?: { status?: ClaimStatus; region?: string }): Promise<number>;
  create(claim: Omit<Claim, "id" | "createdAt" | "updatedAt">): Promise<Claim>;
  update(id: string, data: Partial<Omit<Claim, "id" | "createdAt" | "updatedAt">>): Promise<Claim>;
  getStatusCounts(): Promise<Record<ClaimStatus, number>>;
  getRegionStats(): Promise<Array<{ region: string; claims: number; fraudRate: number }>>;
}
