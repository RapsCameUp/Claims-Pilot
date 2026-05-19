import { pool } from "../database/pool";

export interface PolicyDocument {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  description: string | null;
  extractedText: string | null;
  uploadedBy: string | null;
  uploadedAt: Date;
}

export class PolicyDocumentRepository {
  async findAll(): Promise<PolicyDocument[]> {
    const { rows } = await pool.query(
      "SELECT * FROM policy_documents ORDER BY uploaded_at DESC"
    );
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<PolicyDocument | null> {
    const { rows } = await pool.query(
      "SELECT * FROM policy_documents WHERE id = $1",
      [id]
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async create(doc: Omit<PolicyDocument, "id" | "uploadedAt">): Promise<PolicyDocument> {
    const { rows } = await pool.query(
      `INSERT INTO policy_documents (name, file_name, file_size, mime_type, storage_key, description, extracted_text, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [doc.name, doc.fileName, doc.fileSize, doc.mimeType, doc.storageKey, doc.description, doc.extractedText, doc.uploadedBy]
    );
    return this.mapRow(rows[0]);
  }

  async updateExtractedText(id: string, text: string): Promise<void> {
    await pool.query(
      "UPDATE policy_documents SET extracted_text = $1 WHERE id = $2",
      [text, id]
    );
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM policy_documents WHERE id = $1", [id]);
  }

  async getAllExtractedTexts(): Promise<{ id: string; name: string; extractedText: string }[]> {
    const { rows } = await pool.query(
      "SELECT id, name, extracted_text FROM policy_documents WHERE extracted_text IS NOT NULL AND extracted_text != ''"
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      extractedText: r.extracted_text,
    }));
  }

  private mapRow(row: any): PolicyDocument {
    return {
      id: row.id,
      name: row.name,
      fileName: row.file_name,
      fileSize: parseInt(row.file_size, 10),
      mimeType: row.mime_type,
      storageKey: row.storage_key,
      description: row.description,
      extractedText: row.extracted_text,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    };
  }
}
