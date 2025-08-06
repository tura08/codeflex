# Difficulty Estimator Project Documentation

This document bundles:

- **README**: project features, architecture, file structure, integrations
- **ROADMAP**: phases from MVP through Version 4
- **Context Engineering**: notes on AI integration (e.g. Claude via Cursor)

---

## 📘 README

### 🛠️ Project Features (MVP)

- **Variable Definition**: define project variables (name, weight, score 1–5)
- **Live Calculation**: compute weighted difficulty score in real time
- **Data Table**: summary table of variables and parziali (weight × score)
- **UI Shell**: Next.js + shadcn/ui layout with TopNav, SideNav, main content
- **Persistence**: save & restore project configs to Supabase (free tier, no auth)

### 🏗️ Architecture & Structure

```
/my-project
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx        # RootLayout: imports globals, ThemeProvider, TopNav, SideNav
│  │  ├─ page.tsx          # Dashboard: ProjectList
│  │  ├─ apps/
│  ├─ components/
│  │  ├─ TopNav.tsx        # NavigationMenu + theme toggle
│  │  ├─ SideNav.tsx       # sidebar links
│  │  ├─ ProjectCard.tsx   # card UI for a project summary
│  │  ├─ ProjectList.tsx   # grid of ProjectCard
│  │  ├─ VariableForm.tsx  # form to add variables
│  │  ├─ VariableTable.tsx # editable table of variables
│  │  ├─ ScoreSummary.tsx  # displays weighted score
│  │  └─ ui/               # shadcn/ui primitives (button, input, table, card, etc.)
│  ├─ lib/
│  │  ├─ score.ts         # computeWeightedScore(vars)
│  │  └─ supabase-client.ts# Supabase init
│  └─ styles/
│     └─ globals.css      # Tailwind imports, CSS variables, dark/light overrides
├─ .env.local             # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
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

### Next steps

1. Dashboard Data & ProjectCard Refinement
Replace the static array in DashboardPage with a mocked fetch (e.g. from a local JSON or a React Context) to simulate real data.

Enhance ProjectCard to display a progress bar or difficulty indicator.

Commit & push once your dashboard renders dynamic data nicely.

2. “New Project” Page & VariableForm
Create a route at /apps/new (add src/app/apps/new/page.tsx).

Render your existing VariableForm on that page, alongside a live ScoreSummary.

Ensure the form updates state and the summary updates in real time.

Commit & push after the form + live score works.

3. VariableTable & Editing
Under /apps/[id], scaffold an edit page (e.g. src/app/apps/[id]/page.tsx).

Render your VariableTable there, hooked to the same state you built in “New Project”.

Allow inline edits (name, weight, score) and removals.

Commit & push once editing flows correctly.

4. Supabase Integration
Wire up your Supabase client and create a apps table with columns: id, name, variables (jsonb), created_at.

In /apps/new, on form submit push the new project to Supabase.

In DashboardPage, fetch the list of apps from Supabase instead of mocks.

Commit & push when your app is persisting and retrieving real data.

5. Routing & Navigation
Ensure clicking a ProjectCard navigates to /apps/[id] and loads that project’s details from Supabase.

Add a “Back to Dashboard” link in the project detail page.

Commit & push once navigation and deep-linking works.

6. Basic Authentication (Phase 2 Prep)
Optionally scaffold Supabase Auth (email/password) so that only you can see your apps.

Protect the /apps routes behind a “signed-in” check.

Commit & push when auth gating is in place.

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

