export type ClaimStatus =
  | "FNOL"
  | "Investigation"
  | "Fraud Review"
  | "Policy Validation"
  | "Settlement Review"
  | "Escalated"
  | "Closed";

export type Claim = {
  id: string;
  customer: string;
  policy: string;
  type: string;
  region: string;
  amount: number;
  status: ClaimStatus;
  fraudScore: number;
  confidence: number;
  openedAt: string;
  vehicle?: string;
  description: string;
  assignedAgents: string[];
};

const SA_REGIONS = ["Gauteng", "Johannesburg", "Cape Town", "Durban", "Pretoria", "Sandton", "Stellenbosch"];
const TYPES = ["Auto Collision", "Theft", "Property Damage", "Hail Storm", "Liability", "Medical", "Windscreen"];
const NAMES = [
  "Thandi Mokoena", "Sipho Dlamini", "Naledi Khumalo", "Johan van der Merwe", "Riaan Botha",
  "Lebo Nkosi", "Anika Pillay", "Christiaan du Toit", "Zanele Mthembu", "Wesley Naidoo",
  "Karabo Sithole", "Pieter Smit", "Mandla Zulu", "Carla Joubert", "Ayanda Mabaso",
];

// Deterministic seeded PRNG so SSR and client render identical mock data.
let _seed = 0x9e3779b9;
function srand() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 0xffffffff;
}
function resetSeed(s = 0x9e3779b9) { _seed = s; }
function rand<T>(arr: T[]): T { return arr[Math.floor(srand() * arr.length)]; }
function range(min: number, max: number) { return Math.floor(srand() * (max - min + 1)) + min; }
resetSeed();

const STATUSES: ClaimStatus[] = ["FNOL", "Investigation", "Fraud Review", "Policy Validation", "Settlement Review", "Escalated", "Closed"];

export const CLAIMS: Claim[] = Array.from({ length: 32 }).map((_, i) => {
  const fraudScore = srand() < 0.25 ? range(70, 96) : range(8, 65);
  return {
    id: `CP-${String(10245 + i)}`,
    customer: NAMES[i % NAMES.length],
    policy: `POL-${range(100000, 999999)}`,
    type: rand(TYPES),
    region: rand(SA_REGIONS),
    amount: range(8500, 480000),
    status: STATUSES[i % STATUSES.length],
    fraudScore,
    confidence: range(72, 98),
    openedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 6).toISOString(),
    vehicle: srand() > 0.4 ? `${rand(["Toyota Hilux", "VW Polo", "BMW 320i", "Ford Ranger", "Hyundai i20", "Mercedes C200"])}` : undefined,
    description: "Single-vehicle collision reported on the N1 highway, moderate front-end damage, no third party involved.",
    assignedAgents: ["FNOL", "Policy", "Damage", "Fraud"].slice(0, range(2, 4)),
  };
});

export const FEATURED_CLAIM = CLAIMS[0];

export type AgentDef = {
  key: string;
  name: string;
  role: string;
  status: "Active" | "Idle" | "Reasoning" | "Escalating";
  workload: number;
  confidence: number;
  processed: number;
  task: string;
  color: "info" | "success" | "warning" | "danger" | "cyan";
};

export const AGENTS: AgentDef[] = [
  { key: "fnol", name: "FNOL Intake Agent", role: "First Notice of Loss", status: "Active", workload: 64, confidence: 96, processed: 1284, task: "Verifying policy POL-783221", color: "info" },
  { key: "investigation", name: "Claims Investigation Agent", role: "Evidence correlation", status: "Reasoning", workload: 78, confidence: 91, processed: 942, task: "Cross-referencing repair invoices", color: "cyan" },
  { key: "fraud", name: "Fraud Intelligence Agent", role: "Anomaly detection", status: "Escalating", workload: 88, confidence: 87, processed: 612, task: "Cluster CL-118 — repair shop ring", color: "danger" },
  { key: "policy", name: "Policy Reasoning Agent", role: "Coverage analysis", status: "Active", workload: 52, confidence: 94, processed: 1102, task: "Exclusion check on water damage", color: "info" },
  { key: "damage", name: "Damage Assessment Agent", role: "Multimodal vision", status: "Reasoning", workload: 71, confidence: 89, processed: 880, task: "Estimating bumper replacement cost", color: "warning" },
  { key: "settlement", name: "Settlement Agent", role: "Payout recommendation", status: "Active", workload: 45, confidence: 92, processed: 734, task: "Drafting settlement CP-10247", color: "success" },
  { key: "compliance", name: "Compliance Agent", role: "Regulatory validation", status: "Idle", workload: 22, confidence: 99, processed: 1530, task: "Awaiting FSCA audit batch", color: "info" },
  { key: "reviewer", name: "Decision Reviewer Agent", role: "Final audit & sign-off", status: "Active", workload: 38, confidence: 97, processed: 691, task: "Reviewing settlement consensus", color: "cyan" },
];

export const ACTIVITY_TEMPLATES = [
  { agent: "Fraud Agent", text: "Flagged invoice inconsistency on CP-10268 — 38% above regional average", level: "danger" },
  { agent: "Policy Agent", text: "Identified coverage exclusion clause 4.2(b) on CP-10254", level: "warning" },
  { agent: "Investigation Agent", text: "Requested additional evidence: dashcam footage for CP-10261", level: "info" },
  { agent: "Settlement Agent", text: "Generated payout recommendation R 84,250 for CP-10247", level: "success" },
  { agent: "FNOL Agent", text: "Verified customer policy POL-554120 — active, premium current", level: "success" },
  { agent: "Compliance Agent", text: "Validated POPIA consent on CP-10239", level: "info" },
  { agent: "Damage Agent", text: "Vision model classified damage severity: Moderate (0.91)", level: "info" },
  { agent: "Fraud Agent", text: "Detected duplicate evidence across CP-10219 and CP-10202", level: "danger" },
  { agent: "Investigation Agent", text: "Initiated debate with Damage Agent over repair scope", level: "warning" },
  { agent: "Policy Agent", text: "Confirmed third-party liability coverage on CP-10231", level: "success" },
  { agent: "Settlement Agent", text: "Escalated CP-10268 to senior adjuster — confidence 71%", level: "warning" },
  { agent: "Fraud Agent", text: "Cluster CL-118 expanded — 4 new claims linked to vendor V-2241", level: "danger" },
];

export const PIPELINE_STAGES: { stage: ClaimStatus; color: string }[] = [
  { stage: "FNOL", color: "info" },
  { stage: "Investigation", color: "cyan" },
  { stage: "Fraud Review", color: "danger" },
  { stage: "Policy Validation", color: "warning" },
  { stage: "Settlement Review", color: "success" },
  { stage: "Escalated", color: "danger" },
  { stage: "Closed", color: "muted" },
];

export const KPI = {
  investigatedToday: 1284,
  fraudAlerts: 47,
  avgSettlementHrs: 6.4,
  automationRate: 78,
  estimatedSavings: 12_840_000,
  escalations: 19,
};

export const SETTLEMENT_TREND = Array.from({ length: 14 }).map((_, i) => ({
  day: `D${i + 1}`,
  manual: range(40, 80),
  ai: range(70, 140),
  cycleHrs: +(srand() * 4 + 4).toFixed(1),
}));

export const FRAUD_TREND = Array.from({ length: 12 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  detected: range(20, 90),
  prevented: range(15, 70),
}));

export const REGION_HEATMAP = SA_REGIONS.map(region => ({
  region,
  claims: range(40, 320),
  fraudRate: +(srand() * 0.18 + 0.04).toFixed(3),
}));

export const AGENT_DEBATE = [
  { agent: "Fraud Agent", color: "danger", text: "Invoice amount of R 78,400 exceeds regional repair average by 38%. Vendor V-2241 appears in 4 prior flagged claims.", confidence: 0.87 },
  { agent: "Damage Agent", color: "warning", text: "Vision model classifies damage as Moderate (0.91). Quoted repair scope of full bumper + radiator replacement is inconsistent with observed impact.", confidence: 0.91 },
  { agent: "Policy Agent", color: "info", text: "Coverage POL-554120 is valid and premium is current. Comprehensive cover applies. No exclusions triggered, but suspicious repair inflation pattern noted.", confidence: 0.94 },
  { agent: "Investigation Agent", color: "cyan", text: "Cross-referencing dashcam timestamp with police report reveals 47-minute discrepancy. Recommend customer voice statement re-verification.", confidence: 0.83 },
  { agent: "Settlement Agent", color: "success", text: "Recommend HUMAN ESCALATION before approval. Suggested settlement: R 52,000 pending vendor verification. Confidence: 71%.", confidence: 0.71 },
];

export const INVESTIGATION_TIMELINE = [
  { t: "08:14", agent: "FNOL Agent", action: "Claim opened — POL-554120 verified, customer authenticated via OTP", status: "done" },
  { t: "08:14", agent: "Policy Agent", action: "Coverage validated — Comprehensive Plan, no exclusions triggered", status: "done" },
  { t: "08:15", agent: "Damage Agent", action: "Multimodal vision analysis on 6 photos — severity: Moderate", status: "done" },
  { t: "08:16", agent: "Investigation Agent", action: "Pulled police report MR-2284/24 — cross-referenced location", status: "done" },
  { t: "08:17", agent: "Fraud Agent", action: "Anomaly detected — invoice 38% above regional baseline", status: "active" },
  { t: "08:18", agent: "Investigation Agent", action: "Initiated debate — requesting Damage Agent re-evaluation", status: "active" },
  { t: "08:19", agent: "Settlement Agent", action: "Drafting recommendation — pending fraud resolution", status: "pending" },
  { t: "08:20", agent: "Compliance Agent", action: "POPIA validation queued", status: "pending" },
];

export const FRAUD_RING_NODES = [
  { id: "V-2241", label: "Vendor V-2241", type: "vendor", risk: 0.92 },
  { id: "C-118", label: "Cluster CL-118", type: "cluster", risk: 0.88 },
  { id: "CP-10268", label: "CP-10268", type: "claim", risk: 0.84 },
  { id: "CP-10219", label: "CP-10219", type: "claim", risk: 0.76 },
  { id: "CP-10202", label: "CP-10202", type: "claim", risk: 0.71 },
  { id: "CP-10180", label: "CP-10180", type: "claim", risk: 0.68 },
  { id: "ADJ-44", label: "Adjuster ADJ-44", type: "adjuster", risk: 0.55 },
  { id: "REP-Sandton", label: "RepairShop SDX", type: "vendor", risk: 0.81 },
];

export const FRAUD_RING_EDGES = [
  ["V-2241", "C-118"], ["C-118", "CP-10268"], ["C-118", "CP-10219"], ["C-118", "CP-10202"],
  ["C-118", "CP-10180"], ["ADJ-44", "CP-10219"], ["ADJ-44", "CP-10180"],
  ["REP-Sandton", "CP-10268"], ["REP-Sandton", "CP-10202"], ["V-2241", "REP-Sandton"],
];

export const INSIGHTS = [
  "Claims involving repair shop SDX show 42% elevated fraud likelihood vs regional baseline.",
  "Manual reviews increased 18% in Gauteng region over the past 14 days.",
  "AI automation reduced average claim processing time by 61% quarter-over-quarter.",
  "Vendor V-2241 linked to 4 escalated claims — recommend network-wide review.",
  "Windscreen claims under R 5,000 are 94% auto-resolved within 2 hours.",
];
