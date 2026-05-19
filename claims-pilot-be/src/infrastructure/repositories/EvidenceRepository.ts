import { pool } from "../database/pool";
import { Evidence } from "../../domain/entities/Evidence";
import { IEvidenceRepository } from "../../domain/repositories/IEvidenceRepository";

export class EvidenceRepository implements IEvidenceRepository {
  async findById(id: string): Promise<Evidence | null> {
    const { rows } = await pool.query("SELECT * FROM evidence WHERE id = $1", [id]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByClaimId(claimId: string): Promise<Evidence[]> {
    const { rows } = await pool.query(
      "SELECT * FROM evidence WHERE claim_id = $1 ORDER BY uploaded_at DESC",
      [claimId]
    );
    return rows.map(this.mapRow);
  }

  async create(evidence: Omit<Evidence, "id" | "uploadedAt">): Promise<Evidence> {
    const { rows } = await pool.query(
      `INSERT INTO evidence (claim_id, file_name, file_size, mime_type, kind, storage_key, storage_url, findings, analysis_confidence, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [evidence.claimId, evidence.fileName, evidence.fileSize, evidence.mimeType,
       evidence.kind, evidence.storageKey, evidence.storageUrl,
       evidence.findings ? JSON.stringify(evidence.findings) : null,
       evidence.analysisConfidence, evidence.uploadedBy]
    );
    return this.mapRow(rows[0]);
  }

  async updateFindings(id: string, findings: string[], confidence: number): Promise<Evidence> {
    const { rows } = await pool.query(
      `UPDATE evidence SET findings = $1, analysis_confidence = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(findings), confidence, id]
    );
    return this.mapRow(rows[0]);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM evidence WHERE id = $1", [id]);
  }

  private mapRow(row: any): Evidence {
    return {
      id: row.id,
      claimId: row.claim_id,
      fileName: row.file_name,
      fileSize: parseInt(row.file_size, 10),
      mimeType: row.mime_type,
      kind: row.kind,
      storageKey: row.storage_key,
      storageUrl: row.storage_url,
      findings: row.findings,
      analysisConfidence: row.analysis_confidence ? parseFloat(row.analysis_confidence) : null,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    };
  }
}
