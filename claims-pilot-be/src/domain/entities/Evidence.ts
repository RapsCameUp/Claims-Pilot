export type EvidenceKind = "image" | "document" | "audio" | "video" | "geo" | "other";

export interface Evidence {
  id: string;
  claimId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  kind: EvidenceKind;
  storageKey: string;
  storageUrl: string;
  findings: string[] | null;
  analysisConfidence: number | null;
  uploadedBy: string;
  uploadedAt: Date;
}
