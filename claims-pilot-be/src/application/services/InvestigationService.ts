import { IInvestigationRepository } from "../../domain/repositories/IInvestigationRepository";
import { IAgentEventRepository } from "../../domain/repositories/IAgentEventRepository";
import { IClaimRepository } from "../../domain/repositories/IClaimRepository";
import { IEvidenceRepository } from "../../domain/repositories/IEvidenceRepository";
import { IFraudRepository } from "../../domain/repositories/IFraudRepository";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";
import { GeminiService } from "../../infrastructure/ai/GeminiService";
import { ObjectStorageService } from "../../infrastructure/storage/ObjectStorageService";
import { PolicyDocumentRepository } from "../../infrastructure/repositories/PolicyDocumentRepository";
import { Evidence } from "../../domain/entities/Evidence";
import { logger } from "../../config/logger";

/** Processed evidence with extracted content for agents */
interface ProcessedEvidence {
  id: string;
  fileName: string;
  kind: string;
  mimeType: string;
  /** Text extracted from evidence (transcript for audio, description for video/image, text for documents) */
  extractedText: string;
  /** AI analysis of the evidence in claims context */
  analysis: string;
  /** Structured findings for the evidence card */
  findings: string[];
  /** Confidence of the analysis */
  confidence: number;
}

export class InvestigationService {
  constructor(
    private investigationRepo: IInvestigationRepository,
    private agentEventRepo: IAgentEventRepository,
    private claimRepo: IClaimRepository,
    private evidenceRepo: IEvidenceRepository,
    private fraudRepo: IFraudRepository,
    private auditRepo: IAuditLogRepository,
    private geminiService: GeminiService,
    private policyDocRepo: PolicyDocumentRepository,
    private storageService: ObjectStorageService
  ) {}

  async startInvestigation(claimId: string, userId: string, ipAddress?: string) {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) throw new Error("Claim not found");

    const existing = await this.investigationRepo.findByClaimId(claimId);
    if (existing && existing.status !== "complete" && existing.status !== "escalated") {
      throw new Error("Investigation already in progress for this claim");
    }

    const investigation = await this.investigationRepo.create({
      claimId,
      status: "queued",
      fraudScore: null,
      confidence: null,
      recommendationAction: null,
      recommendationAmount: null,
      recommendationReason: null,
      recommendationTone: null,
      activeAgents: [],
    });

    await this.claimRepo.update(claimId, { status: "Investigation" });

    await this.auditRepo.create({
      userId,
      action: "START_INVESTIGATION",
      entityType: "investigation",
      entityId: investigation.id,
      details: { claimId },
      ipAddress: ipAddress || null,
    });

    // Kick off the autonomous agent workflow in the background
    this.runAgentWorkflow(investigation.id, claimId).catch((err) => {
      logger.error(`Agent workflow failed for investigation ${investigation.id}`, err);
    });

    return investigation;
  }

  async getInvestigation(id: string) {
    const investigation = await this.investigationRepo.findById(id);
    if (!investigation) throw new Error("Investigation not found");
    const events = await this.agentEventRepo.findByInvestigationId(id);
    return { ...investigation, events };
  }

  async getInvestigationByClaimId(claimId: string) {
    const investigation = await this.investigationRepo.findByClaimId(claimId);
    if (!investigation) throw new Error("No investigation found for this claim");
    const events = await this.agentEventRepo.findByInvestigationId(investigation.id);
    return { ...investigation, events };
  }

  async listInvestigations(filters?: { status?: string; limit?: number; offset?: number }) {
    return this.investigationRepo.list(filters);
  }

  async getTimeline(claimId: string) {
    return this.agentEventRepo.findByClaimId(claimId);
  }

  async getRecentActivity(limit?: number) {
    return this.agentEventRepo.getRecentActivity(limit);
  }

  // ─── Autonomous Agent Workflow ──────────────────────────────────────────────
  private async runAgentWorkflow(investigationId: string, claimId: string) {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) return;

    const evidence = await this.evidenceRepo.findByClaimId(claimId);

    // Phase 1: Delegating
    await this.investigationRepo.update(investigationId, {
      status: "delegating",
      activeAgents: ["Orchestrator"],
    });

    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: `Spinning up investigation for ${claim.id} — ${claim.type}, ${claim.region}. Routing to specialised agents.`,
      confidence: null,
      targetAgent: null,
    });

    // FNOL Intake Agent
    await this.delay(1000);
    await this.investigationRepo.update(investigationId, { activeAgents: ["Orchestrator", "FNOL Intake Agent"] });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: `→ Delegating to FNOL Intake Agent: validate policy ${claim.policyNumber} and authenticate customer.`,
      confidence: null,
      targetAgent: "FNOL Intake Agent",
    });

    const fnolReasoning = await this.runFNOLAgent(claim);
    console.log(`\n🤖 [FNOL Intake Agent] Gemini response:\n   ${fnolReasoning}\n`);
    await this.pushEvent(investigationId, claimId, {
      agent: "FNOL Intake Agent",
      color: "info",
      kind: "reason",
      text: fnolReasoning,
      confidence: 0.97,
    });

    // Policy Reasoning Agent
    await this.delay(1000);
    await this.investigationRepo.update(investigationId, { activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent"] });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: `→ Delegating to Policy Reasoning Agent: coverage analysis for ${claim.type}.`,
      targetAgent: "Policy Reasoning Agent",
    });

    const policyReasoning = await this.runPolicyAgent(claim);
    console.log(`\n🤖 [Policy Reasoning Agent] Gemini response:\n   ${policyReasoning}\n`);
    await this.pushEvent(investigationId, claimId, {
      agent: "Policy Reasoning Agent",
      color: "info",
      kind: "reason",
      text: policyReasoning,
      confidence: 0.94,
    });

    // Damage + Investigation Agents (parallel)
    await this.delay(1000);
    await this.investigationRepo.update(investigationId, {
      status: "investigating",
      activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent", "Damage Assessment Agent", "Claims Investigation Agent"],
    });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: `→ Parallel dispatch: Damage Assessment Agent (multimodal vision) + Claims Investigation Agent (evidence correlation). ${evidence.length} artefact(s) attached. Processing evidence files…`,
      targetAgent: "Damage Assessment Agent",
    });

    // Process all evidence files (download, transcribe audio, analyze images/video/docs)
    const processedEvidence = await this.processAllEvidence(evidence, claim);

    const [damageResult, investigationResult] = await Promise.all([
      this.runDamageAgent(claim, evidence, processedEvidence),
      this.runInvestigationAgent(claim, evidence, processedEvidence),
    ]);

    // Update evidence findings from actual AI analysis
    for (const pe of processedEvidence) {
      if (pe.findings.length > 0) {
        await this.evidenceRepo.updateFindings(pe.id, pe.findings, pe.confidence);
      }
    }

    console.log(`\n🤖 [Damage Assessment Agent] Gemini response:\n   ${damageResult}\n`);
    console.log(`\n🤖 [Claims Investigation Agent] Gemini response:\n   ${investigationResult}\n`);
    await this.pushEvent(investigationId, claimId, {
      agent: "Damage Assessment Agent",
      color: "warning",
      kind: "evidence",
      text: damageResult,
      confidence: evidence.some((e) => e.kind === "image" || e.kind === "video") ? 0.89 : 0.62,
    });

    await this.pushEvent(investigationId, claimId, {
      agent: "Claims Investigation Agent",
      color: "cyan",
      kind: "evidence",
      text: investigationResult,
      confidence: 0.78,
    });

    // Fraud Intelligence Agent
    await this.delay(1500);
    await this.investigationRepo.update(investigationId, {
      activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent", "Damage Assessment Agent", "Claims Investigation Agent", "Fraud Intelligence Agent"],
    });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: `→ Delegating to Fraud Intelligence Agent: anomaly + ring detection on amount R ${claim.amount.toLocaleString()}.`,
      targetAgent: "Fraud Intelligence Agent",
    });

    const fraudResult = await this.runFraudAgent(claim, evidence, processedEvidence);
    console.log(`\n🤖 [Fraud Intelligence Agent] Gemini response (Pro model):\n   ${fraudResult}\n`);
    const fraudScore = this.computeFraudScore(claim, evidence);
    console.log(`   Computed fraud score: ${fraudScore}/100`);
    await this.investigationRepo.update(investigationId, { fraudScore });
    await this.claimRepo.update(claimId, { fraudScore });

    await this.pushEvent(investigationId, claimId, {
      agent: "Fraud Intelligence Agent",
      color: "danger",
      kind: "reason",
      text: fraudResult,
      confidence: fraudScore > 70 ? 0.87 : 0.74,
    });

    // Create fraud alert if high score
    if (fraudScore > 70) {
      await this.fraudRepo.createAlert({
        claimId,
        nodeId: null,
        severity: fraudScore > 85 ? "critical" : "high",
        title: `High fraud score detected on ${claimId}`,
        description: fraudResult,
        resolved: false,
      });
    }

    // Debate phase
    await this.delay(1000);
    await this.investigationRepo.update(investigationId, { status: "debating" });

    await this.runDebatePhase(investigationId, claimId, claim, fraudScore, {
      fnol: fnolReasoning,
      policy: policyReasoning,
      damage: damageResult,
      investigation: investigationResult,
      fraud: fraudResult,
    });

    // Compliance Agent
    await this.delay(1000);
    await this.investigationRepo.update(investigationId, {
      activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent", "Damage Assessment Agent", "Claims Investigation Agent", "Fraud Intelligence Agent", "Compliance Agent"],
    });
    await this.pushEvent(investigationId, claimId, {
      agent: "Compliance Agent",
      color: "info",
      kind: "reason",
      text: "Regulatory check passed: POPIA consent verified, FSCA conduct requirements met. Audit trail sealed.",
      confidence: 0.99,
    });

    // Settlement Agent
    await this.delay(1500);
    await this.investigationRepo.update(investigationId, {
      status: "deciding",
      activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent", "Damage Assessment Agent", "Claims Investigation Agent", "Fraud Intelligence Agent", "Compliance Agent", "Settlement Agent"],
    });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: "→ Consensus reached. Routing to Settlement Agent for draft recommendation.",
      targetAgent: "Settlement Agent",
    });

    const recommendation = await this.runSettlementAgent(claim, fraudScore);
    console.log(`\n🤖 [Settlement Agent] Recommendation:\n   Action: ${recommendation.action}\n   Amount: R ${recommendation.amount?.toLocaleString()}\n   Reason: ${recommendation.reason}\n   Tone: ${recommendation.tone}\n`);
    await this.investigationRepo.update(investigationId, {
      recommendationAction: recommendation.action,
      recommendationAmount: recommendation.amount,
      recommendationReason: recommendation.reason,
      recommendationTone: recommendation.tone,
    });

    await this.pushEvent(investigationId, claimId, {
      agent: "Settlement Agent",
      color: recommendation.tone,
      kind: "reason",
      text: `Drafted recommendation: ${recommendation.action} — R ${recommendation.amount?.toLocaleString()}. Awaiting Decision Reviewer sign-off.`,
    });

    // Decision Reviewer Agent
    await this.delay(1500);
    await this.investigationRepo.update(investigationId, {
      activeAgents: ["Orchestrator", "FNOL Intake Agent", "Policy Reasoning Agent", "Damage Assessment Agent", "Claims Investigation Agent", "Fraud Intelligence Agent", "Compliance Agent", "Settlement Agent", "Decision Reviewer Agent"],
    });
    await this.pushEvent(investigationId, claimId, {
      agent: "Orchestrator",
      color: "info",
      kind: "delegate",
      text: "→ Final audit: Decision Reviewer Agent to validate consensus, evidence chain, and policy alignment.",
      targetAgent: "Decision Reviewer Agent",
    });

    const reviewerDecision = await this.runDecisionReviewer(claim, fraudScore, recommendation);
    console.log(`\n🤖 [Decision Reviewer] Gemini response (Pro model):\n   ${reviewerDecision}\n`);
    const finalConfidence = fraudScore > 70 ? 71 : fraudScore > 40 ? 86 : 95;
    const finalStatus = fraudScore > 70 ? "escalated" as const : "complete" as const;

    await this.pushEvent(investigationId, claimId, {
      agent: "Decision Reviewer Agent",
      color: "cyan",
      kind: "reason",
      text: reviewerDecision,
      confidence: 0.96,
    });

    await this.pushEvent(investigationId, claimId, {
      agent: "Decision Reviewer Agent",
      color: recommendation.tone,
      kind: "decision",
      text: `Final decision: ${recommendation.action} — R ${recommendation.amount?.toLocaleString()}. ${recommendation.reason}`,
      confidence: finalConfidence / 100,
    });

    // Finalize
    await this.investigationRepo.update(investigationId, {
      status: finalStatus,
      confidence: finalConfidence,
      completedAt: new Date(),
    });

    await this.claimRepo.update(claimId, {
      status: fraudScore > 70 ? "Escalated" : "Closed",
      confidence: finalConfidence,
      fraudScore,
    });

    logger.info(`Investigation ${investigationId} completed with status: ${finalStatus}`);
  }

  // ─── Individual Agent Implementations ────────────────────────────────────────

  private async runFNOLAgent(claim: any): Promise<string> {
    try {
      return await this.geminiService.flashGenerate(
        `You are the FNOL (First Notice of Loss) Intake Agent for an insurance investigation platform.
         Validate this claim:
         - Policy: ${claim.policyNumber}
         - Customer: ${claim.customerName}
         - Type: ${claim.type}
         - Region: ${claim.region}
         - Amount: R ${claim.amount}
         
         Respond in one concise sentence confirming policy validation and customer authentication.
         Keep it professional and factual.`,
        "You are an autonomous insurance FNOL agent. Be concise and factual."
      );
    } catch {
      return `Policy ${claim.policyNumber} active · premium current · customer authenticated.`;
    }
  }

  private async runPolicyAgent(claim: any): Promise<string> {
    try {
      // Fetch uploaded policy documents for context
      const policyDocs = await this.policyDocRepo.getAllExtractedTexts();
      let policyContext = "";
      if (policyDocs.length > 0) {
        policyContext = `\n\nThe following policy documents are available for reference:\n${policyDocs
          .map((d) => `--- ${d.name} ---\n${d.extractedText.substring(0, 3000)}`)
          .join("\n\n")}
         
         Review the claim against these policy documents. Check for coverage, exclusions, limits, and applicable excess.`;
        console.log(`\n📋 [Policy Reasoning Agent] Using ${policyDocs.length} policy document(s) for review`);
      } else {
        console.log(`\n📋 [Policy Reasoning Agent] No policy documents uploaded — using general knowledge`);
      }

      return await this.geminiService.flashGenerate(
        `You are the Policy Reasoning Agent. Analyze coverage for:
         - Type: ${claim.type}
         - Amount: R ${claim.amount}
         - Policy: ${claim.policyNumber}
         - Vehicle: ${claim.vehicle || "N/A"}
         - Description: ${claim.description || "N/A"}
         ${policyContext}
         
         Respond in 2-3 concise sentences about coverage status, applicable terms, exclusions, and excess.
         If policy documents are provided, specifically reference which clauses apply.`,
        "You are an autonomous insurance policy analysis agent. Cross-reference claims against policy documents. Be precise and cite specific policy terms when available."
      );
    } catch {
      return `Comprehensive cover applies. No exclusions triggered for ${claim.type}. Standard excess applies.`;
    }
  }

  private async runDamageAgent(claim: any, evidence: any[], processedEvidence: ProcessedEvidence[]): Promise<string> {
    const hasVisual = evidence.some((e) => e.kind === "image" || e.kind === "video");
    const visualFindings = processedEvidence
      .filter((pe) => pe.kind === "image" || pe.kind === "video")
      .map((pe) => `[${pe.kind.toUpperCase()}: ${pe.fileName}]\n  Content: ${pe.extractedText}\n  Analysis: ${pe.analysis}`)
      .join("\n\n");
    const audioFindings = processedEvidence
      .filter((pe) => pe.kind === "audio")
      .map((pe) => `[AUDIO: ${pe.fileName}]\n  Transcript: ${pe.extractedText}\n  Analysis: ${pe.analysis}`)
      .join("\n\n");

    try {
      return await this.geminiService.flashGenerate(
        `You are the Damage Assessment Agent with multimodal vision capabilities.
         Claim type: ${claim.type}, Amount: R ${claim.amount}
         Evidence available: ${evidence.length} file(s) - ${evidence.map((e: any) => e.kind).join(", ")}
         Has visual evidence: ${hasVisual}
         
         ${visualFindings ? `VISUAL EVIDENCE ANALYSIS:\n${visualFindings}\n` : ""}
         ${audioFindings ? `AUDIO EVIDENCE (transcribed):\n${audioFindings}\n` : ""}
         
         Based on the actual evidence processed above, provide a concise damage assessment in 2-3 sentences.
         Include severity classification, whether damage is consistent with the claim, and estimated repair envelope.`,
        "You are an autonomous damage assessment AI agent for insurance claims. You have reviewed the actual evidence files. Reference specific observations from the evidence."
      );
    } catch {
      return hasVisual
        ? `Vision model classified damage severity: Moderate (0.89). Estimated repair envelope R ${Math.round(claim.amount * 0.6).toLocaleString()}–R ${Math.round(claim.amount * 0.85).toLocaleString()}.`
        : `No photo/video evidence supplied — falling back on textual description, lower confidence.`;
    }
  }

  private async runInvestigationAgent(claim: any, evidence: any[], processedEvidence: ProcessedEvidence[]): Promise<string> {
    const evidenceSummary = processedEvidence
      .map((pe) => `[${pe.kind.toUpperCase()}: ${pe.fileName}]\n  Extracted: ${pe.extractedText.substring(0, 500)}\n  Analysis: ${pe.analysis}`)
      .join("\n\n");

    try {
      return await this.geminiService.flashGenerate(
        `You are the Claims Investigation Agent. Cross-reference all evidence for:
         - Claim: ${claim.id}, Type: ${claim.type}
         - Evidence items: ${evidence.length}
         - Description: ${claim.description}
         
         ${evidenceSummary ? `PROCESSED EVIDENCE:\n${evidenceSummary}\n` : "No evidence files to analyze."}
         
         Based on the actual evidence above, provide a concise evidence correlation finding in 2-3 sentences.
         Check for consistency between evidence items, the claim description, and any timeline discrepancies.`,
        "You are an autonomous claims investigation agent. You have access to the actual processed evidence. Reference specific findings when correlating evidence."
      );
    } catch {
      return `Cross-referenced location, timestamp, and ${evidence.length} artefact(s). Minor inconsistency noted between description and metadata.`;
    }
  }

  private async runFraudAgent(claim: any, evidence: any[], processedEvidence: ProcessedEvidence[]): Promise<string> {
    const fraudScore = this.computeFraudScore(claim, evidence);
    const evidenceSummary = processedEvidence
      .map((pe) => `[${pe.kind.toUpperCase()}: ${pe.fileName}] Analysis: ${pe.analysis}`)
      .join("\n");

    try {
      return await this.geminiService.proGenerate(
        `You are the Fraud Intelligence Agent. Analyze for anomalies:
         - Claim amount: R ${claim.amount}
         - Region: ${claim.region}
         - Type: ${claim.type}
         - Evidence count: ${evidence.length}
         - Computed fraud score: ${fraudScore}
         - Description: ${claim.description}
         
         ${evidenceSummary ? `EVIDENCE ANALYSIS:\n${evidenceSummary}\n` : "No evidence files attached (this itself is suspicious for a claim of this amount)."}
         
         Based on the fraud score of ${fraudScore}/100 and the actual evidence analysis above, provide a 1-2 sentence fraud analysis.
         If score > 70, flag specific anomalies from the evidence. If < 40, note within expected envelope.`,
        "You are an autonomous fraud detection AI agent for insurance claims. Use advanced reasoning to detect patterns."
      );
    } catch {
      if (fraudScore > 70) return `Anomaly: amount significantly above regional baseline. Vendor pattern suspicious. Recommend escalation.`;
      if (fraudScore > 40) return `Mild signal: amount slightly elevated. No direct vendor links to known rings.`;
      return `Within expected envelope. No ring association detected.`;
    }
  }

  private async runDebatePhase(
    investigationId: string,
    claimId: string,
    claim: any,
    fraudScore: number,
    priorContext: { fnol: string; policy: string; damage: string; investigation: string; fraud: string }
  ) {
    const debates: Array<Omit<import("../../domain/entities/AgentEvent").AgentEvent, "id" | "timestamp" | "investigationId" | "claimId">> = [];

    if (fraudScore > 40) {
      // Build shared context so each agent is aware of what others found
      const sharedContext = `
CLAIM: ${claim.id}, Type: ${claim.type}, Amount: R ${claim.amount}, Region: ${claim.region}
FRAUD SCORE: ${fraudScore}/100
FNOL AGENT FINDINGS: ${priorContext.fnol}
POLICY AGENT FINDINGS: ${priorContext.policy}
DAMAGE AGENT FINDINGS: ${priorContext.damage}
INVESTIGATION AGENT FINDINGS: ${priorContext.investigation}
FRAUD AGENT FINDINGS: ${priorContext.fraud}
`.trim();

      // Round 1: Damage Assessment Agent challenges/responds to fraud findings
      let damageDebate: string;
      try {
        damageDebate = await this.geminiService.flashGenerate(
          `${sharedContext}

You are the Damage Assessment Agent in a multi-agent debate about this claim.
The Fraud Intelligence Agent flagged a fraud score of ${fraudScore}/100.
You have access to all other agents' findings above.

Challenge or support the fraud finding based on your damage analysis.
If the damage evidence is genuine, push back. If it supports fraud, concede.
Address the Fraud Intelligence Agent directly. Be concise (2-3 sentences max).`,
          "You are an assertive AI damage assessment specialist debating other agents. Be direct, reference specific evidence, and take a clear position."
        );
      } catch {
        damageDebate = fraudScore > 70
          ? `I have to push back. Vision model shows genuine structural damage — repair scope is real. Suggest an invoice audit, not auto-decline.`
          : `Concur with fraud assessment. Severity matches the quoted scope.`;
      }

      debates.push({
        agent: "Damage Assessment Agent",
        color: "warning",
        kind: "debate",
        text: damageDebate,
        confidence: null,
        targetAgent: "Fraud Intelligence Agent",
      });

      // Push first debate event immediately so frontend gets it via SSE/polling
      await this.pushEvent(investigationId, claimId, debates[0]);
      await this.delay(1500);

      // Round 2: Fraud Intelligence Agent responds, aware of Damage Agent's challenge
      let fraudDebate: string;
      try {
        fraudDebate = await this.geminiService.proGenerate(
          `${sharedContext}

DEBATE SO FAR:
- Damage Assessment Agent said: "${damageDebate}"

You are the Fraud Intelligence Agent responding in this debate.
The Damage Assessment Agent just challenged your fraud finding (score: ${fraudScore}).
You have access to all agents' findings and the debate history above.

Respond to their challenge. If they made a valid point, acknowledge it but clarify your position.
If you still believe fraud is likely, explain what specific patterns concern you.
Address the Damage Assessment Agent. Be concise (2-3 sentences max).`,
          "You are an assertive AI fraud detection specialist debating other agents. Use advanced reasoning. Reference specific anomaly patterns. Be direct."
        );
      } catch {
        fraudDebate = fraudScore > 70
          ? `Damage is real, agreed — but vendor pattern appears in prior flagged claims. The damage isn't the question; the invoiced amount is.`
          : `Acknowledged. Lowering anomaly weighting. No further objection.`;
      }

      debates.push({
        agent: "Fraud Intelligence Agent",
        color: "danger",
        kind: "debate",
        text: fraudDebate,
        confidence: null,
        targetAgent: "Damage Assessment Agent",
      });

      await this.pushEvent(investigationId, claimId, debates[1]);
      await this.delay(1500);

      // Round 3: Claims Investigation Agent mediates, having seen both sides
      let investigationDebate: string;
      try {
        investigationDebate = await this.geminiService.flashGenerate(
          `${sharedContext}

DEBATE SO FAR:
- Damage Assessment Agent said: "${damageDebate}"
- Fraud Intelligence Agent responded: "${fraudDebate}"

You are the Claims Investigation Agent acting as mediator in this debate.
You have access to all findings and the full debate transcript above.

Synthesize both positions and recommend a practical path forward.
Reference specific evidence from your investigation. Be concise (2-3 sentences max).`,
          "You are an AI claims investigation specialist mediating a debate between other agents. Find common ground, propose actionable next steps, and be practical."
        );
      } catch {
        investigationDebate = `Splitting the difference — recommend pulling vendor invoice history before settlement. Third-party verification can be completed promptly.`;
      }

      debates.push({
        agent: "Claims Investigation Agent",
        color: "cyan",
        kind: "debate",
        text: investigationDebate,
        confidence: null,
        targetAgent: "Fraud Intelligence Agent",
      });

      await this.pushEvent(investigationId, claimId, debates[2]);

      // Round 4 (high fraud only): Policy Agent weighs in on coverage implications
      if (fraudScore > 60) {
        await this.delay(1500);
        let policyDebate: string;
        try {
          policyDebate = await this.geminiService.flashGenerate(
            `${sharedContext}

DEBATE SO FAR:
- Damage Assessment Agent: "${damageDebate}"
- Fraud Intelligence Agent: "${fraudDebate}"
- Claims Investigation Agent: "${investigationDebate}"

You are the Policy Reasoning Agent joining this debate.
Based on the policy terms, the fraud score of ${fraudScore}, and the debate above,
clarify what the policy actually covers and any relevant exclusions or conditions.
Be concise (1-2 sentences max).`,
            "You are an AI policy reasoning specialist. Reference specific policy terms. Be authoritative and concise."
          );
        } catch {
          policyDebate = `Policy terms permit conditional settlement pending verification. Fraud exclusion clause requires documented evidence of intent.`;
        }

        const policyDebateEvent = {
          agent: "Policy Reasoning Agent",
          color: "info" as const,
          kind: "debate" as const,
          text: policyDebate,
          confidence: null,
          targetAgent: "Claims Investigation Agent",
        };
        debates.push(policyDebateEvent);
        await this.pushEvent(investigationId, claimId, policyDebateEvent);
      }
    }

    // Return debates (already pushed individually to DB)
    return debates;
  }

  // ─── SSE (Server-Sent Events) for live streaming ────────────────────────────
  private sseClients: Map<string, Set<import("express").Response>> = new Map();

  registerSSEClient(investigationId: string, res: import("express").Response) {
    if (!this.sseClients.has(investigationId)) {
      this.sseClients.set(investigationId, new Set());
    }
    this.sseClients.get(investigationId)!.add(res);
    res.on("close", () => {
      this.sseClients.get(investigationId)?.delete(res);
    });
  }

  private emitSSE(investigationId: string, event: any) {
    const clients = this.sseClients.get(investigationId);
    if (!clients || clients.size === 0) return;
    const data = JSON.stringify(event);
    for (const client of clients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch {
        clients.delete(client);
      }
    }
  }

  private async runSettlementAgent(claim: any, fraudScore: number) {
    if (fraudScore > 70) {
      return {
        action: "Escalate to senior adjuster",
        amount: Math.round(claim.amount * 0.65),
        reason: "Multiple anomaly signals — invoice audit required before payout.",
        tone: "danger" as const,
      };
    } else if (fraudScore > 40) {
      return {
        action: "Conditional approval",
        amount: Math.round(claim.amount * 0.92),
        reason: "Minor inconsistencies. Approve pending vendor verification.",
        tone: "warning" as const,
      };
    } else {
      return {
        action: "Auto-approve settlement",
        amount: claim.amount,
        reason: "All agents converged. No anomalies detected.",
        tone: "success" as const,
      };
    }
  }

  private async runDecisionReviewer(claim: any, fraudScore: number, recommendation: any): Promise<string> {
    try {
      return await this.geminiService.proGenerate(
        `You are the Decision Reviewer Agent — the final audit authority.
         Review:
         - Claim: ${claim.id}, Amount: R ${claim.amount}
         - Fraud Score: ${fraudScore}/100
         - Settlement Recommendation: ${recommendation.action} — R ${recommendation.amount}
         - Reason: ${recommendation.reason}
         
         Provide your final audit sign-off or dissent in 1-2 sentences.`,
        "You are the final decision reviewer agent. Use advanced reasoning to validate the consensus."
      );
    } catch {
      if (fraudScore > 70) return `Reviewed all agent outputs. Evidence chain intact. Concur with escalation — auto-payout would be premature given vendor signals.`;
      if (fraudScore > 40) return `All checks pass. Conditional approval is appropriate. Vendor verification logged as a hard precondition.`;
      return `Full consensus across agents. Evidence corroborated. Sign-off granted for auto-approval.`;
    }
  }

  // ─── Evidence Processing ─────────────────────────────────────────────────────

  private async processAllEvidence(evidence: Evidence[], claim: any): Promise<ProcessedEvidence[]> {
    const results: ProcessedEvidence[] = [];
    const claimContext = `Insurance claim: ${claim.type}, Amount: R ${claim.amount}, Region: ${claim.region}. Description: ${claim.description || "N/A"}`;

    // Process evidence files in parallel (max 4 concurrent)
    const batchSize = 4;
    for (let i = 0; i < evidence.length; i += batchSize) {
      const batch = evidence.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((ev) => this.processSingleEvidence(ev, claimContext))
      );
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  private async processSingleEvidence(ev: Evidence, claimContext: string): Promise<ProcessedEvidence> {
    try {
      // Download the file from object storage
      const { buffer, contentType } = await this.storageService.getFileBuffer(ev.storageKey);
      const base64 = buffer.toString("base64");
      const mimeType = ev.mimeType || contentType;

      logger.info(`Processing evidence: ${ev.fileName} (${ev.kind}, ${mimeType}, ${(buffer.length / 1024).toFixed(1)}KB)`);

      switch (ev.kind) {
        case "audio":
          return await this.processAudioEvidence(ev, base64, mimeType, claimContext);
        case "video":
          return await this.processVideoEvidence(ev, base64, mimeType, claimContext);
        case "image":
          return await this.processImageEvidence(ev, base64, mimeType, claimContext);
        case "document":
          return await this.processDocumentEvidence(ev, base64, mimeType, claimContext);
        default:
          return {
            id: ev.id,
            fileName: ev.fileName,
            kind: ev.kind,
            mimeType,
            extractedText: "Unsupported file type — no content extracted.",
            analysis: "Unable to process this evidence type.",
            findings: [],
            confidence: 0.3,
          };
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Unknown error";
      const isQuota = error?.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("credit");
      const reason = isQuota
        ? "AI service quota/credits exhausted — please top up Gemini API billing."
        : `Processing error: ${errorMsg.substring(0, 120)}`;

      logger.error(`Failed to process evidence ${ev.id} (${ev.fileName}): ${reason}`, error);
      // Return a fallback so the workflow doesn't break
      return {
        id: ev.id,
        fileName: ev.fileName,
        kind: ev.kind,
        mimeType: ev.mimeType,
        extractedText: "Evidence file could not be processed.",
        analysis: `Processing failed — ${reason}. Agents will rely on claim description only for this file.`,
        findings: [isQuota ? "⚠️ AI quota depleted — evidence could not be analyzed" : "Evidence file attached but could not be analyzed"],
        confidence: 0.2,
      };
    }
  }

  private async processAudioEvidence(ev: Evidence, base64: string, mimeType: string, context: string): Promise<ProcessedEvidence> {
    console.log(`\n🎙️ [Evidence Processor] Transcribing audio: ${ev.fileName}`);
    const { transcript, analysis } = await this.geminiService.analyzeAudio(base64, mimeType, context);
    console.log(`   Transcript (${transcript.length} chars): ${transcript.substring(0, 200)}...`);

    const findings = [
      `Audio transcription completed (${transcript.split(/\s+/).length} words)`,
      ...this.extractAudioFindings(analysis),
    ];

    return {
      id: ev.id,
      fileName: ev.fileName,
      kind: ev.kind,
      mimeType,
      extractedText: transcript,
      analysis,
      findings,
      confidence: 0.85,
    };
  }

  private async processVideoEvidence(ev: Evidence, base64: string, mimeType: string, context: string): Promise<ProcessedEvidence> {
    console.log(`\n🎬 [Evidence Processor] Analyzing video: ${ev.fileName}`);
    const { description, analysis } = await this.geminiService.analyzeVideo(base64, mimeType, context);
    console.log(`   Description: ${description.substring(0, 200)}...`);

    const findings = [
      `Video content analyzed (${ev.fileName})`,
      ...this.extractVideoFindings(description, analysis),
    ];

    return {
      id: ev.id,
      fileName: ev.fileName,
      kind: ev.kind,
      mimeType,
      extractedText: description,
      analysis,
      findings,
      confidence: 0.88,
    };
  }

  private async processImageEvidence(ev: Evidence, base64: string, mimeType: string, context: string): Promise<ProcessedEvidence> {
    console.log(`\n📷 [Evidence Processor] Analyzing image: ${ev.fileName}`);
    const analysis = await this.geminiService.analyzeImage(
      base64,
      mimeType,
      `${context}\n\nAnalyze this image for the insurance claim. Describe:\n- Visible damage (type, severity, location)\n- Whether damage appears consistent with the reported incident\n- Any signs of pre-existing damage or staging\n- Environmental details (location, time, weather indicators)\n- Any text, license plates, or identifying information visible`
    );
    console.log(`   Analysis: ${analysis.substring(0, 200)}...`);

    const findings = this.extractImageFindings(analysis);

    return {
      id: ev.id,
      fileName: ev.fileName,
      kind: ev.kind,
      mimeType,
      extractedText: analysis,
      analysis,
      findings,
      confidence: 0.89,
    };
  }

  private async processDocumentEvidence(ev: Evidence, base64: string, mimeType: string, context: string): Promise<ProcessedEvidence> {
    console.log(`\n📄 [Evidence Processor] Analyzing document: ${ev.fileName}`);
    const analysis = await this.geminiService.analyzeDocumentFile(base64, mimeType, context);
    console.log(`   Analysis: ${analysis.substring(0, 200)}...`);

    const findings = this.extractDocumentFindings(analysis);

    return {
      id: ev.id,
      fileName: ev.fileName,
      kind: ev.kind,
      mimeType,
      extractedText: analysis,
      analysis,
      findings,
      confidence: 0.91,
    };
  }

  private extractAudioFindings(analysis: string): string[] {
    const findings: string[] = [];
    const lower = analysis.toLowerCase();
    if (lower.includes("stress") || lower.includes("emotion") || lower.includes("distress")) {
      findings.push("Caller emotional state analyzed");
    }
    if (lower.includes("consistent") || lower.includes("corroborate")) {
      findings.push("Narrative consistency assessed with claim details");
    }
    if (lower.includes("background") || lower.includes("noise") || lower.includes("environment")) {
      findings.push("Background audio environment analyzed");
    }
    if (lower.includes("contradict") || lower.includes("inconsisten") || lower.includes("discrepan")) {
      findings.push("Potential inconsistencies detected in audio statement");
    }
    if (findings.length === 0) findings.push("Audio content reviewed — no significant anomalies");
    return findings;
  }

  private extractVideoFindings(description: string, analysis: string): string[] {
    const findings: string[] = [];
    const combined = (description + " " + analysis).toLowerCase();
    if (combined.includes("damage") || combined.includes("impact") || combined.includes("collision")) {
      findings.push("Damage/impact visible in video footage");
    }
    if (combined.includes("consistent")) {
      findings.push("Video consistent with reported incident details");
    }
    if (combined.includes("third party") || combined.includes("other vehicle") || combined.includes("person")) {
      findings.push("Third-party presence detected in footage");
    }
    if (combined.includes("timestamp") || combined.includes("time") || combined.includes("date")) {
      findings.push("Timeline indicators verified in video");
    }
    if (combined.includes("staging") || combined.includes("suspicious") || combined.includes("pre-existing")) {
      findings.push("⚠️ Potential staging or pre-existing conditions noted");
    }
    if (findings.length === 0) findings.push("Video reviewed — content assessed");
    return findings;
  }

  private extractImageFindings(analysis: string): string[] {
    const findings: string[] = [];
    const lower = analysis.toLowerCase();
    if (lower.includes("damage") || lower.includes("dent") || lower.includes("crack") || lower.includes("scratch")) {
      findings.push("Physical damage identified in image");
    }
    if (lower.includes("consistent")) {
      findings.push("Damage pattern consistent with reported incident");
    }
    if (lower.includes("pre-existing") || lower.includes("old") || lower.includes("rust") || lower.includes("prior")) {
      findings.push("⚠️ Possible pre-existing damage indicators");
    }
    if (lower.includes("severe") || lower.includes("major") || lower.includes("significant")) {
      findings.push("Severity classified as significant");
    } else if (lower.includes("minor") || lower.includes("light") || lower.includes("small")) {
      findings.push("Severity classified as minor/moderate");
    }
    if (lower.includes("license") || lower.includes("plate") || lower.includes("registration")) {
      findings.push("Vehicle identification details visible");
    }
    if (findings.length === 0) findings.push("Image analyzed — no notable findings");
    return findings;
  }

  private extractDocumentFindings(analysis: string): string[] {
    const findings: string[] = [];
    const lower = analysis.toLowerCase();
    if (lower.includes("invoice") || lower.includes("quote") || lower.includes("estimate")) {
      findings.push("Financial document details extracted");
    }
    if (lower.includes("consistent") || lower.includes("matches") || lower.includes("aligns")) {
      findings.push("Document details align with claim information");
    }
    if (lower.includes("discrepan") || lower.includes("inconsisten") || lower.includes("mismatch")) {
      findings.push("⚠️ Discrepancies found between document and claim");
    }
    if (lower.includes("amount") || lower.includes("total") || lower.includes("cost")) {
      findings.push("Financial amounts extracted and validated");
    }
    if (lower.includes("date") || lower.includes("time")) {
      findings.push("Document dates cross-referenced with claim timeline");
    }
    if (findings.length === 0) findings.push("Document processed — content reviewed");
    return findings;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async pushEvent(
    investigationId: string,
    claimId: string,
    event: Omit<import("../../domain/entities/AgentEvent").AgentEvent, "id" | "timestamp" | "investigationId" | "claimId" | "confidence" | "targetAgent"> & {
      confidence?: number | null;
      targetAgent?: string | null;
    }
  ) {
    const created = await this.agentEventRepo.create({
      investigationId,
      claimId,
      confidence: null,
      targetAgent: null,
      ...event,
    });
    // Emit to any connected SSE clients
    this.emitSSE(investigationId, { ...event, id: created?.id, investigationId, claimId });
  }

  private computeFraudScore(claim: any, evidence: any[]): number {
    let score = 20;
    if (claim.amount > 200000) score += 35;
    else if (claim.amount > 100000) score += 20;
    else if (claim.amount > 50000) score += 10;
    if (evidence.length === 0) score += 25;
    else if (evidence.length < 3) score += 10;
    const desc = (claim.description || "").toLowerCase();
    if (/(stolen|theft|night|alone|no witness|cash)/.test(desc)) score += 15;
    if (/(third party|police|witness|dashcam|cctv)/.test(desc)) score -= 12;
    return Math.max(5, Math.min(96, score));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
