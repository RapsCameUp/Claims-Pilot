import { IClaimRepository } from "../../domain/repositories/IClaimRepository";
import { IEvidenceRepository } from "../../domain/repositories/IEvidenceRepository";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";
import { ClaimStatus, ClaimType } from "../../domain/entities/Claim";
import { ObjectStorageService } from "../../infrastructure/storage/ObjectStorageService";

export interface CreateClaimDTO {
  customerName: string;
  policyNumber: string;
  type: ClaimType;
  region: string;
  amount: number;
  vehicle?: string;
  description: string;
}

export class ClaimService {
  constructor(
    private claimRepo: IClaimRepository,
    private evidenceRepo: IEvidenceRepository,
    private auditRepo: IAuditLogRepository,
    private storageService: ObjectStorageService
  ) {}

  async createClaim(dto: CreateClaimDTO, userId: string, ipAddress?: string) {
    const claim = await this.claimRepo.create({
      customerId: userId,
      customerName: dto.customerName,
      policyNumber: dto.policyNumber,
      type: dto.type,
      region: dto.region,
      amount: dto.amount,
      status: "FNOL",
      fraudScore: null,
      confidence: null,
      vehicle: dto.vehicle || null,
      description: dto.description,
      assignedAgents: ["FNOL"],
      createdBy: userId,
    });

    await this.auditRepo.create({
      userId,
      action: "CREATE_CLAIM",
      entityType: "claim",
      entityId: claim.id,
      details: { type: dto.type, amount: dto.amount, region: dto.region },
      ipAddress: ipAddress || null,
    });

    return claim;
  }

  async getClaim(id: string) {
    const claim = await this.claimRepo.findById(id);
    if (!claim) throw new Error("Claim not found");
    const evidence = await this.evidenceRepo.findByClaimId(id);
    return { ...claim, evidence };
  }

  async listClaims(filters?: { status?: ClaimStatus; region?: string; limit?: number; offset?: number }) {
    const [claims, total] = await Promise.all([
      this.claimRepo.list(filters),
      this.claimRepo.count({ status: filters?.status, region: filters?.region }),
    ]);
    return { claims, total, limit: filters?.limit || 50, offset: filters?.offset || 0 };
  }

  async updateClaimStatus(id: string, status: ClaimStatus, userId: string, ipAddress?: string) {
    const claim = await this.claimRepo.update(id, { status });

    await this.auditRepo.create({
      userId,
      action: "UPDATE_CLAIM_STATUS",
      entityType: "claim",
      entityId: id,
      details: { newStatus: status },
      ipAddress: ipAddress || null,
    });

    return claim;
  }

  async uploadEvidence(
    claimId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: string,
    ipAddress?: string
  ) {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) throw new Error("Claim not found");

    const { key, url } = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      claimId
    );

    const kind = this.classifyFile(file.originalname, file.mimetype);

    const evidence = await this.evidenceRepo.create({
      claimId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      kind,
      storageKey: key,
      storageUrl: url,
      findings: null,
      analysisConfidence: null,
      uploadedBy: userId,
    });

    await this.auditRepo.create({
      userId,
      action: "UPLOAD_EVIDENCE",
      entityType: "evidence",
      entityId: evidence.id,
      details: { claimId, fileName: file.originalname, kind },
      ipAddress: ipAddress || null,
    });

    return evidence;
  }

  async getEvidenceSignedUrl(evidenceId: string) {
    const evidence = await this.evidenceRepo.findById(evidenceId);
    if (!evidence) throw new Error("Evidence not found");
    return this.storageService.getSignedUrl(evidence.storageKey);
  }

  async getStatusCounts() {
    return this.claimRepo.getStatusCounts();
  }

  async getRegionStats() {
    return this.claimRepo.getRegionStats();
  }

  private classifyFile(name: string, mimeType: string): "image" | "document" | "audio" | "video" | "geo" | "other" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (/\.json$|geo|location/i.test(name)) return "geo";
    if (mimeType === "application/pdf" || /\.(pdf|docx?|txt|csv)$/i.test(name)) return "document";
    return "other";
  }
}
