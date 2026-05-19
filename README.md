# Claims Pilot — Agentic AI Insurance Investigation Platform

Claims Pilot is a next-generation insurance claims investigation cockpit that demonstrates how a network of specialized AI agents can collaborate, debate, and reach consensus on complex claims — end-to-end, in real time. The platform is designed for the South African insurance market (with localized regions, vehicle types, currency in ZAR, and POPIA / FSCA compliance hooks), but the architecture is portable to any geography.

The product simulates a "war room" experience: a customer files a claim with multimodal evidence (photos, dashcam video, audio statements, PDFs), and within seconds a team of autonomous agents fans out to validate the policy, analyze the evidence, hunt for fraud, draft a settlement, and pass everything through a final reviewer. Every reasoning step, agent debate, and confidence score is exposed in the UI so adjusters and compliance teams can audit the decision.

---

## Table of Contents

1. [Why this exists](#why-this-exists)
2. [Core capabilities](#core-capabilities)
3. [The agent roster](#the-agent-roster)
4. [How an investigation flows](#how-an-investigation-flows)
5. [Architecture](#architecture)
6. [Tech stack](#tech-stack)
7. [Project structure](#project-structure)
8. [Getting started](#getting-started)
9. [API reference](#api-reference)
10. [Design system](#design-system)
11. [Roadmap](#roadmap)

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
- **Real-time SSE Streaming** — Server-Sent Events deliver agent outputs and debate messages to the UI in real time as they are generated.
- **Multimodal Evidence Processing** — images analyzed via computer vision, audio transcribed and analyzed, video described and assessed, documents OCR'd and cross-referenced — all by Gemini AI.
- **Conversational Agent Debates** — chat-style transcript where agents push back on each other (e.g. Fraud Agent vs. Damage Agent) with AI-generated arguments informed by all prior agent findings.
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
| **FNOL Intake Agent** | First Notice of Loss | Authenticates the customer, validates the policy is active and the premium is current, captures the loss event, and normalizes the claim metadata. |
| **Policy Reasoning Agent** | Coverage analysis | Reads the policy wording, evaluates exclusions and endorsements, confirms whether the loss event is covered, and flags any clause that limits the payout. |
| **Damage Assessment Agent** | Multimodal vision | Runs computer-vision models on every uploaded photo and video frame. Classifies damage severity, identifies impacted parts, and estimates repair scope. |
| **Claims Investigation Agent** | Evidence correlation | Cross-references police reports, dashcam timestamps, GPS data, audio transcripts, and customer statements. Hunts for inconsistencies and flags evidence gaps. |
| **Fraud Intelligence Agent** | Anomaly & ring detection | Compares the claim against regional baselines, vendor history, and known fraud clusters. Flags inflated invoices, duplicate evidence across claims, and links to suspicious vendors. Uses Gemini Pro model. |
| **Compliance Agent** | Regulatory validation | Validates POPIA consent, FSCA reporting requirements, sanctions screening, and jurisdiction-specific obligations. |
| **Settlement Agent** | Payout recommendation | Synthesizes evidence, debate, and policy limits into a settlement amount with a confidence score. Escalates to a human adjuster when confidence drops below threshold. |
| **Decision Reviewer Agent** | Final audit & sign-off | Audits the consensus, re-checks that every flagged risk was addressed, and either signs off the settlement or kicks the claim back for human review. Uses Gemini Pro model. |

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
         │            │  debate (AI-generated, context-aware)
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

### Investigation phases

| Phase | Status | What happens |
|---|---|---|
| **1. Delegating** | `delegating` | Orchestrator validates the claim and routes to specialist agents sequentially |
| **2. Investigating** | `investigating` | Parallel dispatch: Damage + Investigation agents process evidence while Fraud agent analyzes patterns |
| **3. Debating** | `debating` | Agents challenge each other's findings with full context awareness. Each agent sees all prior reasoning. |
| **4. Deciding** | `deciding` | Settlement Agent drafts recommendation; Decision Reviewer audits and signs off |
| **5. Complete** | `complete` / `escalated` | Claim closed or escalated to human adjuster based on fraud score |

### Debate mechanics

When the fraud score exceeds 40, agents enter a structured debate:

1. **Damage Assessment Agent** challenges or supports the fraud finding based on physical evidence.
2. **Fraud Intelligence Agent** responds with specific pattern data, acknowledging valid counter-points.
3. **Claims Investigation Agent** mediates, synthesizing both positions into a practical recommendation.
4. **Policy Reasoning Agent** (if fraud score > 60) clarifies coverage implications and applicable exclusions.

All debate content is AI-generated with each agent seeing the full debate transcript of prior speakers.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                      Frontend (claims-pilot-fe)           │
│  TanStack Start · React 19 · Tailwind CSS · Radix UI    │
│  File-based routing · SSE streaming · Cloudflare Workers │
└────────────────────────────┬─────────────────────────────┘
                             │ REST + SSE
┌────────────────────────────┴─────────────────────────────┐
│                      Backend (claims-pilot-be)            │
│  Express.js · Clean Architecture · JWT Auth              │
├──────────────────────────────────────────────────────────┤
│  Application (Services + Agent Orchestration)            │
├──────────────────────────────────────────────────────────┤
│  Domain (Entities + Repository Interfaces)               │
├──────────────────────────────────────────────────────────┤
│  Infrastructure (PostgreSQL · Gemini AI · S3 Storage)    │
└──────────────────────────────────────────────────────────┘
```

### Multimodal evidence processing

| Evidence type | Processing |
|---|---|
| **Image** (JPG, PNG, WebP) | Vision analysis: damage severity, impact patterns, pre-existing damage detection, GPS metadata validation |
| **Video** (MP4, WebM) | Frame-by-frame description, damage assessment, timeline verification, staging indicators |
| **Audio** (MP3, WAV, M4A) | Full transcription, stress marker analysis, narrative consistency, contradiction detection |
| **Document** (PDF, DOCX) | OCR + content extraction: amounts, dates, reference numbers, vendor details, invoice validation |

### Dual-model strategy

| Agent | Model | Rationale |
|---|---|---|
| FNOL, Policy, Damage, Investigation, Settlement | Gemini Flash | Fast, real-time reasoning |
| Fraud Intelligence, Decision Reviewer | Gemini Pro | Complex multi-step reasoning for highest-stakes decisions |

---

## Tech stack

### Frontend (`claims-pilot-fe`)

- **Framework:** TanStack Start v1 (React 19, file-based routing, SSR-ready)
- **Build:** Vite 7
- **Runtime target:** Cloudflare Workers (edge)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **UI primitives:** Radix UI + custom shadcn-style components
- **Animation:** Framer Motion
- **Charts:** Recharts
- **Icons:** lucide-react

### Backend (`claims-pilot-be`)

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (hosted on Vultr)
- **AI:** Google Gemini API (`@google/generative-ai`) — Flash + Pro models
- **Object storage:** S3-compatible (Vultr Object Storage)
- **Auth:** JWT with bcrypt password hashing
- **Validation:** Zod
- **Logging:** Winston
- **API docs:** Swagger (swagger-jsdoc + swagger-ui-express)
- **Security:** Helmet, CORS, rate limiting

---

## Project structure

```text
claims-pilot/
├── claims-pilot-fe/          frontend application
│   ├── src/
│   │   ├── components/       app shell + shadcn-style UI components
│   │   ├── hooks/            React hooks
│   │   ├── lib/              API client, state management, utilities
│   │   ├── routes/           file-based routing (TanStack Start)
│   │   └── styles.css        Tailwind v4 + design tokens
│   ├── package.json
│   └── vite.config.ts
│
├── claims-pilot-be/          backend application
│   ├── src/
│   │   ├── config/           environment, logger, swagger
│   │   ├── domain/           entities + repository interfaces
│   │   ├── application/      services + agent orchestration engine
│   │   ├── infrastructure/   PostgreSQL repos, Gemini AI, S3 storage
│   │   └── presentation/     Express routes + middleware
│   ├── package.json
│   └── tsconfig.json
│
└── README.md                 ← you are here
```

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Gemini API key
- S3-compatible object storage (e.g. Vultr Object Storage)

### Backend setup

```bash
cd claims-pilot-be

# install dependencies
npm install

# configure environment
cp .env.example .env
# edit .env with your database, Gemini, and storage credentials

# run database migrations
npm run migrate

# seed initial data (optional)
npm run seed

# start development server
npm run dev
```

The backend runs at `http://localhost:4000`. Swagger docs at `http://localhost:4000/api/docs`.

#### Backend environment variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port | No (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GEMINI_FLASH_MODEL` | Flash model name | No (default: `gemini-2.0-flash`) |
| `GEMINI_PRO_MODEL` | Pro model name | No (default: `gemini-2.0-pro`) |
| `OBJECT_STORAGE_ENDPOINT` | S3-compatible endpoint URL | Yes |
| `OBJECT_STORAGE_REGION` | Storage region | Yes |
| `OBJECT_STORAGE_BUCKET` | Bucket name | Yes |
| `OBJECT_STORAGE_ACCESS_KEY` | S3 access key | Yes |
| `OBJECT_STORAGE_SECRET_KEY` | S3 secret key | Yes |

### Frontend setup

```bash
cd claims-pilot-fe

# install dependencies
npm install

# start dev server (connects to backend on localhost:4000)
npm run dev
```

The frontend runs at `http://localhost:5173`.

#### Frontend environment variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000/api` |

---

## API reference

Full Swagger documentation available at `http://localhost:4000/api/docs` when the backend is running.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user profile |

### Claims

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/claims` | List claims (filterable by status, region) |
| GET | `/api/claims/:id` | Get claim detail with evidence |
| POST | `/api/claims` | Create new claim |
| PATCH | `/api/claims/:id/status` | Update claim status |
| POST | `/api/claims/:id/evidence` | Upload evidence files (multipart) |
| GET | `/api/claims/:id/evidence/:eid/url` | Get signed download URL for evidence file |

### Investigations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/investigations` | List all investigations |
| GET | `/api/investigations/:id` | Get investigation with full event timeline |
| GET | `/api/investigations/claim/:claimId` | Lookup investigation by claim ID |
| POST | `/api/investigations/start/:claimId` | Start autonomous investigation |
| GET | `/api/investigations/:id/stream` | SSE stream of live events |
| GET | `/api/investigations/timeline/:claimId` | Event timeline for claim |
| GET | `/api/investigations/activity/recent` | Recent agent activity feed |

### Fraud

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/fraud/graph` | Fraud network graph (nodes + edges) |
| GET | `/api/fraud/alerts` | Fraud alerts (filterable) |
| PATCH | `/api/fraud/alerts/:id/resolve` | Resolve a fraud alert |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/settlement-trend` | Settlement trend data |

### Policy Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/policy-documents` | Upload policy document (PDF) |
| GET | `/api/policy-documents` | List uploaded policy documents |

---

## Application routes

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

## Database

PostgreSQL with the following core tables:

- `users` — Authentication and roles
- `claims` — Insurance claim records with metadata
- `evidence` — Uploaded files with AI-generated findings
- `investigations` — Investigation state, fraud score, recommendation
- `agent_events` — Full audit trail of every agent action, reasoning step, and debate message
- `fraud_alerts` — Generated fraud alerts with severity
- `audit_logs` — User action audit trail
- `policy_documents` — Uploaded policy PDFs with extracted text

Migrations run automatically on server start.

---

## Design system

Claims Pilot uses an editorial dark cockpit aesthetic with deliberate restraint:

- **Color tokens** are defined in `claims-pilot-fe/src/styles.css` using `oklch()` for perceptual uniformity across light/dark modes.
- Always use **semantic tokens** (`bg-background`, `text-foreground`, `border-border`, `text-primary`, `bg-card`, etc.) — never raw color classes.
- Status colors follow a five-level system: `info`, `success`, `warning`, `danger`, `cyan`.
- Animations are scarce and intentional — the war-room pulse on active agents is the hero motion; everything else is quiet.

---

## Roadmap

- [ ] WebSocket upgrade for sub-second streaming (currently SSE + 2s polling fallback)
- [ ] Agent configuration persistence (enable/disable from Settings UI)
- [ ] Investigation pause/resume capability
- [ ] Token and cost tracking per investigation (Gemini API usage metrics)
- [ ] Policy document preview and inline agent citations
- [ ] Export investigation report as PDF
- [ ] Multi-language support (Afrikaans, Zulu, Xhosa)
