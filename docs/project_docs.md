# CodeFlex: Project Definition & Roadmap

## Project Overview

**CodeFlex** is a browser‑based platform designed to guide developers through the entire lifecycle of a software idea—from initial scoping and difficulty rating to detailed feature breakdown and step‑by‑step execution. It helps users:

* **Quantify complexity** by assigning weighted scores to key variables (e.g., UI complexity, data transfer, backend effort) and calculating a live difficulty rating.
* **Store and track** project metadata, roadmaps, and progress in a centralized database (Supabase).
* **Generate structured plans** (MVP features, future phases, technology stack recommendations) to move from concept to production.

## Core Concepts

1. **Variables & Weights**: Identify the critical factors affecting project complexity, assign each a weight (1–5), then rate the project against each variable.
2. **Weighted Score**: Compute a single difficulty metric as a sum of `(weight × rating)`, normalized to a 1–5 scale.
3. **Phase Planning**: Break the project into MVP, Phase 2, Phase 3, etc., with clear feature sets and technology requirements.
4. **Persistent Storage**: Use Supabase to save projects, variables, scores, and detailed notes, enabling multi‑session editing and collaboration.

---

### 🛠️ Project Features (MVP)

- **Variable Definition**: define project variables (name, weight, score 1–5)
- **Live Calculation**: compute weighted difficulty score in real time
- **Data Table**: summary table of variables and parziali (weight × score)
- **UI Shell**: Next.js + shadcn/ui layout with NavBar, SideBar, main content
- **Persistence**: save & restore project configs to Supabase (free tier, no auth)

### 🏗️ Architecture & Structure

```
/my-project
├─ src/
│  ├─ app/
│  │  ├─ apps/
│  │  │  └─ [id]/
│  │  │  └─ new/
│  │  ├─ settings/
│  │  ├─ variables/
│  │  ├─ layout.tsx        # RootLayout: imports globals, ThemeProvider, TopNav, SideNav
│  │  ├─ page.tsx          # Dashboard: ProjectList
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ NavBar.tsx        # NavigationMenu + theme toggle
│  │  ├─ SideBar.tsx       # sidebar links
│  │  ├─ ProjectCard.tsx   # card UI for a project summary
│  │  ├─ ProjectList.tsx   # grid of ProjectCard
│  │  ├─ VariableForm.tsx  # form to add variables
│  │  ├─ VariableTable.tsx # editable table of variables
│  │  └─ ui/               # shadcn/ui primitives (button, input, table, card, etc.)
│  ├─ hooks/
│  │  └─ use-mobile.tsx
│  ├─ context/
│  │  └─ ProjectContext.tsx
│  ├─ lib/
│  │  ├─ score.ts         # computeWeightedScore(vars)
│  │  └─ supabase-client.ts   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
│  └─ models/
│     └─ project.ts
├─ .env.local
├─ tailwind.config.js     # Tailwind content & theme extension
├─ postcss.config.js
├─ next.config.js
├─ tsconfig.json
└─ package.json
```
---

### Variables & Weights

| Variable                         | Weight |
|----------------------------------|-------:|
| Backend Complexity               | 0.24   |
| UI Interactions                  | 0.14   |
| AI Limitations                   | 0.14   |
| Data Transfer                    | 0.10   |
| Technology Familiarity           | 0.10   |
| External Integrations            | 0.10   |
| Authentication & Permissions     | 0.05   |
| Data Model                       | 0.05   |
| Real-time / Scheduling           | 0.04   |
| Export & Reporting               | 0.04   |

---

### 🔗 Integrations & Connections

- **Supabase** (free-tier)
  - Table `apps`: `id` (UUID), `name`, `variables` (JSON), `created_at`
  - CRUD via Next.js API Routes (`src/app/api/apps/...`)
- **Next.js App Router**: file-based routes under `app/`
- **shadcn/ui**: styled components (button, input, table, card, navigation-menu)
- **Tailwind CSS**: utility-first styling, integrated in `globals.css`
- **ThemeProvider**: `next-themes` for light/dark switching

---

## 🚀 ROADMAP (MVP → Version 4)

### MVP
1. Frontend Next.js + shadcn/ui shell (NavBar, SideBar, Dashboard)
2. VariableForm + live ScoreSummary + VariableTable
3. Save & restore configs in Supabase (no auth)

### Phase 2
1. Multi-user authentication (Supabase Auth or Auth0)
2. Dashboard: list apps, filters (date, score)
3. Templates: pre-defined variable sets

### Phase 3
1. AI integration: generate next-step suggestions based on score
2. Export: Markdown files for AI coding tools (Cursor, etc.)
3. Shareable permalinks, collaboration features

### Phase 4
1. Analytics & benchmarking: competition analysis panel
2. Scheduling & notifications (reminders, deadlines)
3. Public API for CI/task-manager integrations

---

