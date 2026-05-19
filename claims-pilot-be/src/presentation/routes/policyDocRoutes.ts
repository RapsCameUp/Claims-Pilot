import { Router, Response } from "express";
import multer from "multer";
import { PolicyDocumentRepository } from "../../infrastructure/repositories/PolicyDocumentRepository";
import { ObjectStorageService } from "../../infrastructure/storage/ObjectStorageService";
import { GeminiService } from "../../infrastructure/ai/GeminiService";
import { AuthRequest, authenticate } from "../middleware/auth";
import { logger } from "../../config/logger";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export function createPolicyDocRouter(
  policyDocRepo: PolicyDocumentRepository,
  storageService: ObjectStorageService,
  geminiService: GeminiService
) {
  const router = Router();

  /**
   * @swagger
   * /api/policy-documents:
   *   get:
   *     summary: List all policy documents
   *     tags: [Policy Documents]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: List of policy documents }
   */
  router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
    try {
      const docs = await policyDocRepo.findAll();
      res.json(docs);
    } catch (error: any) {
      logger.error("Error listing policy documents:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/policy-documents:
   *   post:
   *     summary: Upload a policy document
   *     tags: [Policy Documents]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *     responses:
   *       201: { description: Uploaded policy document }
   */
  router.post("/", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const name = req.body.name || file.originalname;
      const description = req.body.description || null;

      // Upload to object storage
      const { key } = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        "policy-documents"
      );

      // Extract text content using Gemini for PDF/document types
      let extractedText: string | null = null;
      try {
        if (file.mimetype === "application/pdf" || file.mimetype.startsWith("text/")) {
          if (file.mimetype.startsWith("text/")) {
            extractedText = file.buffer.toString("utf-8");
          } else {
            // Use Gemini to extract text from PDF
            const base64 = file.buffer.toString("base64");
            extractedText = await geminiService.flashGenerate(
              `Extract ALL text content from this document. Return ONLY the raw text content, preserving the structure. Do not add commentary.`,
              "You are a document text extraction tool. Extract text faithfully."
            );
            // For PDF, also try inline data extraction
            try {
              const result = await geminiService.analyzeImage(base64, file.mimetype,
                "Extract ALL text content from this policy document. Return ONLY the raw text content, preserving structure, headings, clauses, and coverage details."
              );
              extractedText = result;
            } catch {
              // Fall back to filename-based description
              extractedText = `Policy document: ${name}. Description: ${description || "No description provided."}`;
            }
          }
        } else {
          extractedText = `Policy document: ${name}. Description: ${description || "No description provided."}`;
        }
        console.log(`📄 [Policy Document] Extracted ${extractedText?.length || 0} chars from "${name}"`);
      } catch (err) {
        logger.warn(`Could not extract text from policy document "${name}":`, err);
        extractedText = `Policy document: ${name}. Description: ${description || "No description provided."}`;
      }

      const doc = await policyDocRepo.create({
        name,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey: key,
        description,
        extractedText,
        uploadedBy: req.user!.userId,
      });

      res.status(201).json(doc);
    } catch (error: any) {
      logger.error("Error uploading policy document:", error);
      res.status(400).json({ error: error.message || "Upload failed" });
    }
  });

  /**
   * @swagger
   * /api/policy-documents/{id}:
   *   delete:
   *     summary: Delete a policy document
   *     tags: [Policy Documents]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       204: { description: Deleted }
   */
  router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const doc = await policyDocRepo.findById(req.params.id);
      if (!doc) {
        res.status(404).json({ error: "Policy document not found" });
        return;
      }
      await storageService.deleteFile(doc.storageKey);
      await policyDocRepo.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      logger.error("Error deleting policy document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
