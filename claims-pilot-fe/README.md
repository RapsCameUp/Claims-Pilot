# Claims Pilot — Agentic AI Insurance Investigation Platform

Claims Pilot is a next-generation insurance claims investigation cockpit that demonstrates how a network of specialized AI agents can collaborate, debate, and reach consensus on complex claims — end-to-end, in real time. The platform is designed for the South African insurance market (with localized regions, vehicle types, currency in ZAR, and POPIA / FSCA compliance hooks), but the architecture is portable to any geography.

The product simulates a "war room" experience: a customer files a claim with multimodal evidence (photos, dashcam video, audio statements, PDFs), and within seconds a team of autonomous agents fans out to validate the policy, analyze the evidence, hunt for fraud, draft a settlement, and pass everything through a final reviewer. Every reasoning step, agent debate, and confidence score is exposed in the UI so adjusters and compliance teams can audit the decision.

---

## Table of Contents

1. [Why this exists](#why-this-exists)
2. [Core capabilities](#core-capabilities)
3. [The agent roster](#the-agent-roster)
4. [How an investigation flows](#how-an-investigation-flows)
5. [Application surface](#application-surface)
6. [Tech stack](#tech-stack)
7. [Project structure](#project-structure)
8. [Running locally](#running-locally)
9. [Design system](#design-system)
10. [Roadmap](#roadmap)

---

## Why this exists

Traditional claims processing is slow, opaque, and easy to game. A single adjuster might take days to triangulate a police report, repair invoice, dashcam footage, and policy fine-print — and fraud rings exploit the latency. Claims Pilot collapses that timeline by orchestrating purpose-built AI agents that:

- Process every modality (text, image, video, audio, PDF) in parallel.
- **Argue with each other** — no single agent has the final word; consensus emerges from structured debate.
- Surface their reasoning, evidence trail, and confidence so a human can sign off (or override) with full context.
- Detect cross-claim patterns (vendor rings, repeat offenders, geographic anomalies) that no individual reviewer would notice.

The result: faster settlements for honest customers, sharper detection of suspicious claims, and a complete audit trail for regulators.

---

## Core capabilities

- **New Claim Intake** — upload photos, video (≤100 MB), audio, and documents with policy metadata.
- **Live Investigation War Room** — watch agents activate one-by-one with streaming reasoning, multimodal evidence findings, and a live workflow graph.
- **Conversational Agent Debates** — chat-style transcript where agents push back on each other (e.g. Fraud Agent vs. Damage Agent) before consensus is reached.
- **Final Decision Reviewer** — an audit agent signs off on the settlement recommendation before the claim is closed.
- **Interactive Workflow Dossier** — once an investigation completes, every node in the workflow graph is clickable and opens a polished modal with that agent's reasoning trace, linked evidence, debate contributions, and final ruling.
- **Active Claims Queue & Dashboard** — KPIs, settlement trends, fraud heatmaps, and a sortable claims table.
- **Fraud Intelligence View** — visualization of suspected fraud rings with vendors, adjusters, and linked claims as a graph.
- **Settings** — full CRUD on escalation rules, plus enable/disable toggles for every agent in the roster.

---

## The agent roster

Claims Pilot ships with **eight specialized agents**. Each one owns a single responsibility, exposes a confidence score, and contributes to the shared debate.

| Agent | Role | What it actually does |
|---|---|---|
| **FNOL Intake Agent** | First Notice of Loss | Authenticates the customer, validates the policy is active and the premium is current, captures the loss event, and normalizes the claim metadata. The entry point for every investigation. |
| **Policy Reasoning Agent** | Coverage analysis | Reads the policy wording, evaluates exclusions and endorsements, confirms whether the loss event is covered, and flags any clause that limits the payout. |
| **Damage Assessment Agent** | Multimodal vision | Runs computer-vision models on every uploaded photo and video frame. Classifies damage severity, identifies impacted parts, and estimates repair scope. Produces inline findings such as "Front-left bumper deformation" or "Frame 00:18 — vehicle crosses against signal". |
| **Claims Investigation Agent** | Evidence correlation | Cross-references police reports, dashcam timestamps, GPS data, and customer statements. Hunts for inconsistencies (e.g. timestamp mismatches between the police report and dashcam) and requests additional evidence when gaps appear. |
| **Fraud Intelligence Agent** | Anomaly & ring detection | Compares the claim against regional baselines, vendor history, and known fraud clusters. Flags inflated invoices, duplicate evidence across claims, and links to suspicious vendors or adjusters. |
| **Compliance Agent** | Regulatory validation | Validates POPIA consent, FSCA reporting requirements, sanctions screening, and any jurisdiction-specific obligations. Idle until the claim is ready to close. |
| **Settlement Agent** | Payout recommendation | Synthesizes the evidence, debate, and policy limits into a settlement amount with a confidence score. Escalates to a human adjuster when confidence drops below threshold. |
| **Decision Reviewer Agent** | Final audit & sign-off | The last word. Audits the consensus, re-checks that every flagged risk was addressed, and either signs off the settlement or kicks the claim back for human review. |

All eight agents can be individually enabled or disabled from **Settings → AI Agent Configuration**.

---

## How an investigation flows

```text
    ┌──────────┐
    │   FNOL   │  policy verified, customer authenticated
    └────┬─────┘
         │
    ┌────┴─────┐
    │  Policy  │  coverage validated, exclusions checked
    └────┬─────┘
         │
   ┌─────┴─────┐
   │  Damage   │   ◄──┐  multimodal vision on photos/video
   └─────┬─────┘      │
         │            │  debate
   ┌─────┴─────┐      │
   │Investig'n │  ────┤  cross-reference reports & evidence
   └─────┬─────┘      │
         │            │
   ┌─────┴─────┐      │
   │   Fraud   │  ────┘  anomaly + ring detection
   └─────┬─────┘
         │
   ┌─────┴─────┐
   │Compliance │  POPIA / FSCA validation
   └─────┬─────┘
         │
   ┌─────┴─────┐
   │Settlement │  payout recommendation + confidence
   └─────┬─────┘
         │
   ┌─────┴─────┐
   │ Reviewer  │  final audit & sign-off
   └─────┬─────┘
         │
       Closed  /  Escalated
```

1. A user submits a claim from **New Claim** with policy details and evidence files.
2. The investigation page opens and agents activate sequentially, streaming reasoning into the live timeline.
3. Multimodal evidence is analyzed inline — each photo, video, or audio file shows AI findings with confidence scores.
4. When agents disagree (typically Fraud vs. Damage on inflated repair scope), a chat-style debate panel renders their back-and-forth.
5. The Settlement Agent drafts a recommendation; the Decision Reviewer either signs it off or escalates.
6. Once complete, every node in the workflow graph becomes clickable — opening a dossier modal with the full reasoning trail.

---

## Application surface

| Route | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/login`, `/register` | Authentication |
| `/app/dashboard` | KPIs, active claims queue, recent activity |
| `/app/new-claim` | Submit a new claim with evidence uploads |
| `/app/investigation` | Index of all active and historical investigations |
| `/app/investigation/$id` | Live war-room view for a single claim |
| `/app/claim/$id` | Full claim detail and metadata |
| `/app/fraud` | Fraud ring graph and intelligence feed |
| `/app/analytics` | Settlement trends, fraud trends, regional heatmap |
| `/app/settings` | Agent configuration, escalation rules, profile |

---

## Tech stack

- **Framework:** TanStack Start v1 (React 19, file-based routing, SSR-ready)
- **Build:** Vite 7
- **Runtime target:** Cloudflare Workers (edge)
- **Styling:** Tailwind CSS v4 with semantic design tokens in `src/styles.css` (oklch color space)
- **UI primitives:** Radix UI + custom shadcn-style components in `src/components`
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Icons:** lucide-react
- **State:** Lightweight in-memory store (`src/lib/claims-store.ts`) with deterministic seeded mock data for SSR-safe rendering

The app is currently demo-grade: claims, debates, and timelines are simulated by `claims-store.ts` so the experience is fully interactive without a backend. L

---

## Project structure

```text
src/
├── components/
│   ├── app/              shell, navigation, shared primitives
│   └── ui/               shadcn-style design system components
├── hooks/                use-mobile, etc.
├── lib/
│   ├── mock-data.ts      claims, agents, debates, KPIs, fraud rings
│   ├── claims-store.ts   live investigation simulation engine
│   └── utils.ts          cn() and helpers
├── routes/               file-based routing (TanStack Start)
│   ├── __root.tsx        root shell
│   ├── index.tsx         landing
│   ├── login.tsx
│   ├── register.tsx
│   ├── app.tsx           authenticated app layout
│   ├── app.dashboard.tsx
│   ├── app.new-claim.tsx
│   ├── app.investigation.index.tsx
│   ├── app.investigation.$id.tsx
│   ├── app.claim.$id.tsx
│   ├── app.fraud.tsx
│   ├── app.analytics.tsx
│   └── app.settings.tsx
├── styles.css            Tailwind v4 + design tokens
├── router.tsx
└── start.ts
```

---

## Running locally

```bash
# install
bun install

# dev server
bun run dev

# production build
bun run build

# preview the built worker bundle
bun run preview
```

The dev server runs at `http://localhost:5173`. There are no required environment variables for the demo experience.

---

## Design system

Claims Pilot uses an editorial dark cockpit aesthetic with deliberate restraint:

- **Color tokens** are defined in `src/styles.css` using `oklch()` for perceptual uniformity across light/dark modes.
- Always use **semantic tokens** (`bg-background`, `text-foreground`, `border-border`, `text-primary`, `bg-card`, etc.) — never raw color classes.
- Status colors follow a five-level system: `info`, `success`, `warning`, `danger`, `cyan`.
- Animations are scarce and intentional — the war-room pulse on active agents is the hero motion; everything else is quiet.

---
