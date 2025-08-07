<!-- File: docs/project_overview.md -->

# CodeFlex Project Overview

**Purpose:**
CodeFlex empowers developers to go from idea to code by combining an AI‑powered analysis engine with one‑click integrations and deployment. It removes guesswork around project complexity and scaffolding, providing:

* **Automatic Complexity Scoring**
  Quantify effort by evaluating a natural‑language project description against a curated set of variables (UI complexity, data flows, backend needs, etc.).

* **Phase-by-Phase Guidance**
  Generate structured recommendations—an MVP feature set, Version 1 enhancements, later phasing—complete with technology stack suggestions.

* **Seamless Bootstrapping**
  Connect your GitHub account and click to provision a code repository from a template, with optional future support for Supabase/Firebase, Vercel, Docker, Google Sheets, and more.

**Key Components:**

1. **Variables Model** stored in Supabase for versioned, editable scoring criteria.
2. **LLM Integration** via OpenAI (initially `gpt-4o-mini`, upgradeable later).
3. **Next.js Frontend** with pages for Dashboard, New Project, and Project Details.
4. **API Routes** (`/api/projects`, `/api/analyze`, `/api/auth/github`, `/api/integrations/github/*`).
5. **Templates Directory** housing boilerplates (e.g., Next.js + Supabase).

---

### User Flows

1. **Analyze an Idea**

   * Enter project name & description → AI returns a difficulty score + JSON‑formatted phase breakdown + tech stack.
2. **Track & Iterate**

   * Save analysis to Dashboard → revisit any project to see details & re‑run analysis.
3. **Bootstrap Code**

   * Connect GitHub via OAuth → select a template → generate a new repo matching your project name.

<!-- File: docs/mvp.md -->

# CodeFlex Alpha MVP Guide

This document defines the minimal end‑to‑end slice to validate our two core concepts.

## 1. Data & Schema

* **Table: `prompts`**
  Holds versioned AI prompts. Fields: `id`, `type` (system/user), `content` (text).
* **Table: `projects`**
  Captures user projects. Fields: `id`, `name`, `description`, `analysis` (jsonb), `created_at`.
* **Table: `integrations`**
  Stores OAuth tokens. Fields: `id`, `user_id`, `provider`, `access_token`, `connected_at`.

## 2. Seed Initial Prompts

1. **System Prompt** (`type=system`):

   > "You are CodeFlex, an AI assistant that evaluates software projects according to a fixed set of variables..."

2. **User Prompt** (`type=user`):

   > "Variables: {{variable\_list}}\nDescription: {{description}}\nRespond in valid JSON: `{ score: number, phases: Phase[], techStack: string[] }`"

## 3. Backend API Endpoints

1. **POST `/api/projects`**

   * Payload: `{ name, description }` → inserts a new record.
2. **POST `/api/analyze`**

   * Payload: `{ projectId }` →

     1. Fetch prompts (system + user)
     2. Replace `{{description}}` in user prompt
     3. Call OpenAI `gpt-3.5-turbo`
     4. Retry-on-parse-error until valid JSON
     5. Update `projects.analysis`
     6. Return analysis JSON
3. **GET `/api/projects`** & **GET `/api/projects/[id]`** for list/detail

## 4. Frontend Pages (Next.js + shadcn/ui)

1. **Dashboard**: List all projects; display `analysis.score` if available.
2. **New Project**: Form for `name` + `description`; on submit, call `/api/projects`, then `/api/analyze`, then redirect.
3. **Project Detail**: Show analysis JSON in human‑readable cards/tables; include a “Re‑analyze” button.

## 5. GitHub Integration

1. **Register** GitHub OAuth App → obtain client ID/secret.
2. **Endpoints:**

   * `/api/auth/github/login` → redirect user to GitHub consent.
   * `/api/auth/github/callback` → exchange code for token; store in `integrations`.
3. **UI:**

   * “Connect GitHub” button in Settings.
   * On Project Detail, show “Create GitHub Repo” if connected.
4. **Repo Bootstrapping:**

   * Templates located in `/templates/nextjs-supabase/`.
   * Endpoint `/api/integrations/github/create-repo` uses Octokit to create a repo named after the project and push the template.

## 6. Deployment & Testing

* Deploy Supabase schema and Next.js to Vercel or local Docker.
* Test full flow: New Project → Analysis → Dashboard → GitHub Connect → Repo Bootstrapping.

<!-- File: docs/roadmap_versions.md -->

# CodeFlex Roadmap: Versions 1–3

## Version 1: Refinement & Configurability

* **User‑Managed API Keys**: allow users to supply their own OpenAI/Anthropic credentials.
* **Prompt Editor UI**: enable editing & previewing prompts in the app.
* **Improved Analysis UI**: table & chart visualizations of variable contributions.
* **Multiple Variable Sets**: create and switch between custom schemas (e.g., Web App, Mobile App).

## Version 2: Expanded Integrations

* **Supabase/Firebase Provisioning**: automate database setup via API/CLI.
* **Vercel/Netlify Deployment**: one‑click deploy of front and back ends.
* **Template Marketplace**: discover and install community‑contributed templates.
* **Google Sheets Connector**: OAuth + read/write sync with Sheets as a data source.

## Version 3: Collaboration & Insights

* **Team Workspaces**: invite collaborators, assign roles, share projects.
* **Real‑Time Notifications**: Slack/email/push alerts on analysis completion and deadlines.
* **Benchmarking Dashboard**: compare your project scores against aggregate community data.
* **Public REST & CLI API**: allow external CI/CD tools to trigger analysis and scaffolding.
