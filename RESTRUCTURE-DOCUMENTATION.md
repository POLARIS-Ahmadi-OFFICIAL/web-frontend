# **POLARIS**

The goal of this documentation is to set a plan for the updated structure and organization of the POLARIS app. 

## **Tech Stack**

### **Repos**

Multiple repos allows us to keep all of our code organized and trackable. Also allows us to create a CI/CD (Github Actions) workflow for each section of the application. We will use a strict API layer to ensure that all of the repos will be able to connect together seamlessly.

- Backend-API
- Shared-Types (Enables consistent data structures between FrontEnd and BackEnd)
- Web-Frontend (using Vercel to deploy)
- Mobile-Development 

### **FrontEnd**

- React w/ Next.js (Web UI)
  - Tailwind CSS
- React-Native (Mobile UI)
  - NativeWind (Tailwind CSS for Mobile)
- Expo (Packaging for Mobile)
- Electron (Packaging for Desktop)
  - Works collaboratively with Next.js

### **BackEnd**

- FastAPI (API Layer)
- Supabase (App Authentication)
  - Using Github

### **Database**

*SQLite -> PostgreSQL*

- PostgreSQL (Primary & Session Caching) - Supabase Server
- FAISS (Vector Database for AI Agents)

### **AI-Agent Orchestration**

- LangGraph (Organization, Routing, & Workflow)
- MCP Server (Connecting External Services)
  - Google Drives, Literature Agent, Web Components, etc.
- Google-Gemini Services or Local Models (Qwen)
- Watcher 
  - FileSystemEventHandler (MacOS/Linux) and Watchdog (Windows)

### **Github Workflows**

- Web-Fronted deployment workflow via Vercel
- Mobile-Development deployment workflow via Expo
- Desktop application deployment via Electron

## Migration status

Four-repo split is in progress. See:

- [MIGRATION.md](./MIGRATION.md) (web)
- [docs/CUTOVER.md](./docs/CUTOVER.md) (release runbook)
- Sibling repos: `backend-api`, `shared-types`, `mobile-development` each have `MIGRATION.md` and `.github/workflows/ci.yml`
