import { Investigation } from "../entities/Investigation";

export interface IInvestigationRepository {
  findById(id: string): Promise<Investigation | null>;
  findByClaimId(claimId: string): Promise<Investigation | null>;
  list(filters?: { status?: string; limit?: number; offset?: number }): Promise<Investigation[]>;
  create(investigation: Omit<Investigation, "id" | "startedAt" | "completedAt">): Promise<Investigation>;
  update(id: string, data: Partial<Omit<Investigation, "id" | "startedAt">>): Promise<Investigation>;
}
