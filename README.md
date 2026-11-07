# Roman Urdu Complaint Classifier (Awaaz-e-Awam)
### AI-Powered Civic Complaint Management Platform for Karachi Municipal Services

[![Institution: Greenwich University](https://img.shields.io/badge/Institution-Greenwich%20University%2C%20Karachi-1e3a8a.svg)](https://greenwich.edu.pk/)
[![Phase: 1 of 5](https://img.shields.io/badge/Milestone-Phase%201%20(Citizen%20Foundation)-0d9488.svg)]()
[![Stack: React + TS + Tailwind](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Tailwind-blue.svg)]()
[![License: Open Source](https://img.shields.io/badge/License-MIT-green.svg)]()

---

## 🏛️ Project Overview

**Roman Urdu Complaint Classifier** is a capstone software engineering project developed for **Greenwich University, Karachi, Pakistan**.

The platform provides a modern, reliable, and accessible civic complaint mechanism for citizens of Karachi. While public discourse and mobile grievance communication across Pakistan occurs predominantly in **Roman Urdu** (Urdu phonetically transcribed in the Latin alphabet), municipal service dispatchers struggle with manual triage and routing across fragmented utility and civil bodies:
- **KW&SC** — Karachi Water & Sewerage Corporation
- **SSWMB** — Sindh Solid Waste Management Board
- **K-Electric** — Power supply & electrical infrastructure
- **KMC / DMCs** — Karachi Metropolitan Corporation & District Municipal Corporations
- **SDA / SBCA** — Building & infrastructure authorities

This platform bridges this critical divide by ingesting complaints in **Roman Urdu, standard English, or Urdu script**, processing intent through intelligent classification, and routing complaints to the appropriate civic department with verifiable tracking and accountability.

> [!NOTE]
> **Phase 1 Delivery:** This milestone establishes the complete **Citizen Portal Foundation**, architectural scaffolding, responsive civic design system, complaint submission workflow with 200-word constraint enforcement, tracking timeline visualization, bilingual localization (English & Urdu with RTL support), and unit test harnesses. All functionality runs locally with zero paid APIs and zero external credentials.

---

## 🚀 Key Features in Phase 1

1. **Civic-Tech Design System & Brand Identity:**
   - Bespoke brand identity (**Awaaz-e-Awam**) featuring deep navy (`#0F172A`), restrained emerald/teal (`#0D9488`), and neutral slate backgrounds.
   - Distinctive civic crest emblem, clear typography hierarchy, and WCAG AA accessible contrast.
   - Fully responsive for mobile, tablet, and desktop viewports.

2. **Public Landing Page:**
   - Engaging civic hero section with direct call-to-actions ("Submit Complaint" & "Track Complaint").
   - 4-step workflow breakdown illustrating Roman Urdu ingestion through AI classification to departmental resolution.
   - Feature highlights addressing multi-script support, privacy safeguards, and departmental transparency.

3. **Citizen Complaint Submission Form:**
   - Structured citizen grievance intake: Full Name, Phone Number, Karachi District selection (East, West, Central, South, Malir, Korangi, Keamari), Locality/Area, and optional private residential address.
   - Dual-language support for Complaint Title & Description.
   - **Enforced 200-Word Maximum Limit:** Interactive real-time word counter with color-coded threshold feedback.
   - Accepts Roman Urdu (*"Hamare mohallay mein kachray ke dher lage hue hain..."*), English, and Nastaliq Urdu script.
   - Transparent disclaimer: explicitly informs citizens that department classification will be performed automatically by AI in subsequent phases.
   - Form validation with clear error messages and simulation feedback.

4. **Interactive Complaint Tracking UI Prototype:**
   - Lookup by unique complaint reference number (e.g., `KHI-2026-7842`).
   - Detailed complaint review with sanitized public data (PII protected).
   - Visual progress timeline displaying lifecycle states: *Submitted*, *AI Classified*, *Department Assigned*, *In Progress*, and *Resolved*.
   - Typed, realistic mock data for Karachi municipal contexts.

5. **Citizen Dashboard Prototype:**
   - Comprehensive overview cards: Total, In Progress, Pending Review, and Resolved.
   - Recent submissions list with searchable/filterable reference codes, status badges, and timestamps.
   - Empty state illustrations and demonstration banners.

6. **Authentication UI Foundations:**
   - Clean, professional sign-in and registration screens for future citizen and staff accounts.
   - Strict security principle: zero plaintext passwords stored in `localStorage`.

7. **Bilingual Localization (English & Urdu):**
   - Seamless one-click language toggle.
   - Dynamic document direction handling (`dir="rtl"` for Urdu, `dir="ltr"` for English).
   - Designed to preserve the natural readability of Roman Urdu in both language modes.

---

## 🛠️ Technology Stack (100% Free & Open Source)

- **UI Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/) + [JSDOM](https://github.com/jsdom/jsdom)
- **Linting:** [Oxlint](https://oxc-project.github.io/) / ESLint

---

## 📂 Repository Structure

```
RomanUrdu_ComplaintClassifier/
├── docs/
│   ├── ARCHITECTURE.md          # Architectural blueprints, layers & role matrix
│   └── DEVELOPMENT.md           # Git conventions, commit rules & team standards
├── public/                      # Static assets & favicon
├── src/
│   ├── assets/                  # Civic emblems & brand vectors
│   ├── components/
│   │   ├── citizen/             # ComplaintCard, ComplaintTimeline, StatsCard, EmptyState
│   │   ├── common/              # Button, Input, Card, Badge, Modal, WordCounter, LanguageToggle
│   │   └── layout/              # PublicHeader, CitizenHeader, CitizenSidebar, Footer, Container
│   ├── context/
│   │   └── LanguageContext.tsx  # Bilingual state & RTL layout controller
│   ├── features/
│   │   ├── auth/                # Login & Registration UI foundations
│   │   └── citizen/             # ComplaintForm, ComplaintTracker, CitizenOverview
│   ├── hooks/                   # Custom reusable React hooks
│   ├── i18n/                    # English & Urdu translation dictionaries
│   ├── mocks/                   # Typed simulated complaints & Karachi municipal data
│   ├── routes/                  # AppRoutes with future /department & /admin extension points
│   ├── services/                # Service interfaces (IComplaintService contract for Supabase)
│   ├── test/                    # Unit & component test suites
│   ├── types/                   # TypeScript domain contracts
│   ├── utils/                   # Word counter, date formatters, validation logic
│   ├── App.tsx                  # Root application router wrapper
│   ├── index.css                # Civic color tokens & base typography
│   └── main.tsx                 # Application entry point
├── .env.example                 # Environment configuration template
├── .gitignore                   # Standard Node.js & security exclusion rules
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # TypeScript strict configuration
└── vite.config.ts               # Vite & Tailwind configuration
```

---

## ⚙️ Quickstart & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/RomanUrdu_ComplaintClassifier.git
cd RomanUrdu_ComplaintClassifier
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Run automated tests
```bash
npm test
```

### 5. Build for production
```bash
npm run build
```

---

## 📅 Multi-Phase Roadmap (Through December 2026)

- [x] **Phase 1 (Completed):** Repository Setup, Architecture & Citizen Portal Foundation
- [ ] **Phase 2:** Supabase PostgreSQL Database, Row-Level Security & Secure Authentication
- [ ] **Phase 3:** Roman Urdu NLP Classification Model & Automated Routing Dispatcher
- [ ] **Phase 4:** Departmental Portal (`/department`) & Administrative Control Room (`/admin`)
- [ ] **Phase 5:** City-wide Analytics, SLA Escalation Workflows, UAT & University Showcase

---

## 📜 Academic Integrity & License

This project is submitted in partial fulfillment of the requirements for the degree program at **Greenwich University, Karachi, Pakistan**.  
Released under the [MIT License](LICENSE).
