import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { config } from "../../config";
import { logger } from "../../config/logger";

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export class GeminiService {
  private flashModel: GenerativeModel;
  private proModel: GenerativeModel;

  constructor() {
    this.flashModel = genAI.getGenerativeModel({ model: config.gemini.flashModel });
    this.proModel = genAI.getGenerativeModel({ model: config.gemini.proModel });
  }

  /** Use Flash for fast, real-time reasoning tasks */
  async flashGenerate(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const model = systemInstruction
        ? genAI.getGenerativeModel({ model: config.gemini.flashModel, systemInstruction })
        : this.flashModel;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error("Gemini Flash generation error", error);
      throw error;
    }
  }

  /** Use Pro for complex multi-step reasoning */
  async proGenerate(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const model = systemInstruction
        ? genAI.getGenerativeModel({ model: config.gemini.proModel, systemInstruction })
        : this.proModel;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error("Gemini Pro generation error", error);
      throw error;
    }
  }

  /** Analyze image evidence using Flash vision */
  async analyzeImage(imageBase64: string, mimeType: string, context: string): Promise<string> {
    try {
      const result = await this.flashModel.generateContent([
        {
          inlineData: { data: imageBase64, mimeType },
        },
        { text: context },
      ]);
      return result.response.text();
    } catch (error) {
      logger.error("Gemini image analysis error", error);
      throw error;
    }
  }

  /** Analyze document content */
  async analyzeDocument(documentText: string, context: string): Promise<string> {
    return this.flashGenerate(
      `${context}\n\nDocument content:\n${documentText}`,
      "You are an insurance claims document analyst. Extract key information, validate details, and flag inconsistencies."
    );
  }

  /** Transcribe and analyze audio using Gemini multimodal */
  async analyzeAudio(audioBase64: string, mimeType: string, context: string): Promise<{ transcript: string; analysis: string }> {
    try {
      const model = genAI.getGenerativeModel({
        model: config.gemini.flashModel,
        systemInstruction: "You are an insurance claims audio analyst. Transcribe audio accurately and analyze the content for claims-relevant information.",
      });

      // Step 1: Transcribe the audio
      const transcriptResult = await model.generateContent([
        { inlineData: { data: audioBase64, mimeType } },
        { text: "Transcribe this audio recording verbatim. Output only the transcript text, no commentary." },
      ]);
      const transcript = transcriptResult.response.text();

      // Step 2: Analyze the transcript in claims context
      const analysisResult = await model.generateContent([
        { inlineData: { data: audioBase64, mimeType } },
        { text: `${context}\n\nAnalyze this audio recording for an insurance claim investigation. Consider:\n- Caller stress level and emotional state\n- Key factual claims made\n- Consistency of the narrative\n- Background sounds or environmental clues\n- Any contradictions or red flags\n\nProvide a concise 2-3 sentence analysis.` },
      ]);
      const analysis = analysisResult.response.text();

      return { transcript, analysis };
    } catch (error) {
      logger.error("Gemini audio analysis error", error);
      throw error;
    }
  }

  /** Analyze video evidence using Gemini multimodal */
  async analyzeVideo(videoBase64: string, mimeType: string, context: string): Promise<{ description: string; analysis: string }> {
    try {
      const model = genAI.getGenerativeModel({
        model: config.gemini.flashModel,
        systemInstruction: "You are an insurance claims video analyst. Analyze video evidence for damage assessment, incident verification, and fraud detection.",
      });

      // Step 1: Describe what's in the video
      const descResult = await model.generateContent([
        { inlineData: { data: videoBase64, mimeType } },
        { text: "Describe what you observe in this video recording. Note any damage, vehicles, people, timestamps, locations, and relevant details. Be factual and concise." },
      ]);
      const description = descResult.response.text();

      // Step 2: Claims-specific analysis
      const analysisResult = await model.generateContent([
        { inlineData: { data: videoBase64, mimeType } },
        { text: `${context}\n\nAnalyze this video evidence for the insurance claim. Consider:\n- Visible damage and severity\n- Consistency with reported incident\n- Environmental factors (weather, lighting, time of day)\n- Any signs of staging or pre-existing damage\n- Third-party involvement\n\nProvide a concise 2-3 sentence analysis.` },
      ]);
      const analysis = analysisResult.response.text();

      return { description, analysis };
    } catch (error) {
      logger.error("Gemini video analysis error", error);
      throw error;
    }
  }

  /** Analyze a PDF or document file using multimodal */
  async analyzeDocumentFile(docBase64: string, mimeType: string, context: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: config.gemini.flashModel,
        systemInstruction: "You are an insurance claims document analyst. Extract key information, validate details, and flag inconsistencies.",
      });

      const result = await model.generateContent([
        { inlineData: { data: docBase64, mimeType } },
        { text: `${context}\n\nAnalyze this document for the insurance claim. Extract key details such as:\n- Dates, amounts, and reference numbers\n- Names of parties involved\n- Repair or service items\n- Any inconsistencies with the claim\n\nProvide a concise summary of findings.` },
      ]);
      return result.response.text();
    } catch (error) {
      logger.error("Gemini document file analysis error", error);
      throw error;
    }
  }
}
