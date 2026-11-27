# BenefitBridge

**Find the support you may be eligible for.**

BenefitBridge is a student benefits-discovery project with a React frontend and FastAPI/MongoDB backend. Presentation demo sign-in provides a separate, clearly labeled local session; connected mode reads verified MongoDB records and falls back to the 20-record built-in official catalogue when none are available or MongoDB is temporarily unreachable.

---

## Setup

### Prerequisites

- Node.js 18+ (https://nodejs.org)
- npm 9+

### Install and run

```bash
cd benefitbridge
npm install
npm run dev
```

Open http://localhost:5173

### Build for production

```bash
npm run build
npm run preview
```

### Backend API (FastAPI + MongoDB Atlas)

The backend API is in `backend/`. Python 3.10+ and a MongoDB Atlas database are required. The backend loads `backend/.env` automatically; operating-system environment variables take precedence over values in the file.

Open `backend/.env` in a local editor and set:

- `MONGODB_URI`: your Atlas connection string. Replace its username/password and cluster placeholders. URL-encode special characters in the database password.
- `MONGODB_DATABASE`: database name (defaults to `benefitbridge`).
- `GROQ_API_KEY`: your Groq API key. It is used only by the optional connection-check script; the BenefitBridge assistant is not implemented.
- `JWT_SECRET`: a randomly generated secret of at least 32 characters. A local secret is generated when this project first creates the file; replace it if the file was copied from the example.

Never paste credentials into source files, frontend configuration, chat, or screenshots. `backend/.env` is ignored by Git. Keep `backend/.env.example` as a placeholder-only template.

Install dependencies and verify service connectivity from the `backend` directory:

```powershell
cd backend
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python check_connections.py
```

The connection checker sends a MongoDB ping and a short, non-sensitive Groq test prompt using a model returned by Groq's model-list API. It reports success or a safe error category without printing credentials or raw provider error bodies. Both credentials must be entered locally before their respective checks can succeed.

### Built-in official scholarship catalogue

`backend/official_scholarships.json` contains twenty source-reviewed records from the Tamil Nadu BC/MBC/DNC Welfare Department, Ministry of Tribal Affairs, AICTE and other official Indian scholarship sources. The API reads verified MongoDB records first and serves this local JSON catalogue when MongoDB has no verified scholarship records or a catalogue query fails. Personalized recommendations require MongoDB and a saved profile; mixed-feature KNN ranks eligible or information-needed records without training data. `scheme_id` is stable and unique. Unknown application status, deadlines, amounts and document lists are not treated as confirmed.

Run the seed from the backend directory after configuring `backend/.env`:

```powershell
cd backend
.\.venv\Scripts\python.exe .\seed_official_schemes.py
```

The script validates every record, enforces a sparse unique index on `scheme_id`, inserts missing records, and backfills catalogue metadata without replacing other existing scheme details. Records cite [Tamil Nadu BC/MBC/DNC welfare schemes](https://bcmbcmw.tn.gov.in/welfschemes.htm), the [Ministry of Tribal Affairs](https://tribal.nic.in/Scholarship.aspx), and [AICTE student development schemes](https://aicte.gov.in/index.php/schemes/students-development-schemes). No deadline or document checklist is inferred when an official source does not publish one. Four Tamil Nadu entries currently have no working application route in the source; their cards show that limitation instead of linking to a default nginx page.

To manage or verify additional records, enable the protected scheme-management page by promoting an existing account from the backend directory:

```powershell
.\.venv\Scripts\python.exe .\promote_admin.py your-account@example.com
```

The script requires typing `PROMOTE` before it changes the selected account's role. Sign in again, then open `http://127.0.0.1:5173/admin`. Add scheme details using current official sources. New or edited records remain pending and are excluded from student results. Before verifying, confirm the unique scheme ID, official source, eligibility rules and published benefit amount (or enter `Amount not specified by official source` when applicable). Provide an official application URL when one is published; otherwise set status to `Status Not Confirmed` and explain that no route is published. Eligibility rule operators are `equals`, `lte`, `gte`, `one_of`, and `manual_review`. Use `manual_review` for a published condition that cannot be safely decided from the saved profile. Verification is an administrator attestation, not automatic fact-checking.

Start the API from the same directory:

```powershell
uvicorn app.main:app --reload
```

The API health check is at `http://127.0.0.1:8000/health`; interactive API documentation is at `http://127.0.0.1:8000/docs`. If MongoDB cannot be reached, the API starts in degraded mode so its health endpoint can report the problem. `/health` returns HTTP 503 while the database is unavailable, and database-backed operations also return HTTP 503. Protected operations require a valid `JWT_SECRET`.

To connect the frontend, copy the root `.env.example` to `.env`, keep `VITE_API_BASE_URL=http://127.0.0.1:8000`, and restart Vite. In connected mode, users must register or sign in before opening the dashboard.

---

## Project structure

```
src/
  components/
    layout/
      Navbar.tsx          # Sticky top navigation
      Sidebar.tsx         # Dashboard sidebar + mobile bottom nav
      DashboardLayout.tsx # Authenticated layout wrapper
    ui/
      primitives.tsx      # Button, Card, Input, Select, Badge, Modal, Toast, Stepper, Tabs, Skeleton, EmptyState, Tooltip, Breadcrumb
      domain.tsx          # BenefitCard, CategoryBadge, EligibilityBadge, DocumentCard, DeadlineCard, ApplicationTimeline, ScoreRing, MatchScore
      index.ts            # Barrel export
  pages/
    HomePage.tsx          # Public landing page
    SearchPage.tsx        # Benefits search with filters
    BenefitDetailPage.tsx # Full benefit detail with eligibility breakdown
    OnboardingPage.tsx    # 6-step profile creation
    ResourcesPage.tsx     # Editorial guides
    DashboardPage.tsx     # Authenticated overview
    MyBenefitsPage.tsx    # Benefits management with tabs
    EligibilityPage.tsx   # Side-by-side eligibility assessment
    DocumentsPage.tsx     # Secure document management
    ApplicationsPage.tsx  # Application tracking with timeline
    DeadlinesPage.tsx     # Deadline center grouped by urgency
    NotificationsPage.tsx # Notification center
    ProfilePage.tsx       # Profile + Settings
    admin/
      AdminPage.tsx       # Admin benefit management
  data/
    mockData.ts           # Illustrative benefit and resource records; not verified
  services/
    api.ts                # Browser-demo persistence and API abstraction
  types/
    index.ts              # All TypeScript types
  utils/
    index.ts              # Utility functions and style maps
backend/
  app/main.py             # FastAPI auth, profile, benefit, document, and application endpoints
  app/official_catalogue.py # JSON loader for the built-in catalogue
  official_scholarships.json # Built-in source-reviewed scheme data and URLs
  seed_official_schemes.py # Idempotent import/backfill of official schemes
  requirements.txt        # Python dependencies
  .env.example            # Backend configuration template
```

---

## Current limitations

- Without frontend `.env` configuration, the app uses local demo mode. Profile, saved-benefit, application, and notification state are stored in browser `localStorage`, without encryption or account access control. Do not enter sensitive details on a shared device.
- With the frontend and backend configured, login, profile, application, verified benefit, deadline, notification, and owner-scoped document endpoints use the API. JWTs are kept in the current browser session.
- Secure upload accepts PDF/JPG/PNG files up to the configured limit and stores file bytes in MongoDB. Files remain marked as needing review; BenefitBridge does not officially verify them.
- When MongoDB has no verified schemes or the catalogue query temporarily fails, the API serves the twenty-record built-in catalogue. The import script can also populate MongoDB; unknown deadlines and document checklists remain unspecified where official sources do not publish them.
- Tamil UI translations and the AI assistant are not implemented. Administrator scheme management is available at `/admin` to accounts explicitly promoted with `backend/promote_admin.py`. New and edited records are pending until an administrator reviews and verifies them.
- Eligibility checks on the backend require verified scheme records with validated `eligibility_rules`; the API does not invent fallback results. Production deployment still needs operational controls such as rate limiting, monitoring, backups, and a reviewed data-retention policy.

---

## Pages and routes

| Route | Page |
|---|---|
| `/` | Landing page |
| `/search` | Benefits search |
| `/benefits/:id` | Benefit detail |
| `/onboarding` | Profile creation |
| `/resources` | Guides |
| `/dashboard` | Overview |
| `/dashboard/benefits` | My benefits |
| `/dashboard/eligibility` | Eligibility assessment |
| `/dashboard/documents` | Document center |
| `/dashboard/applications` | Application tracking |
| `/dashboard/deadlines` | Deadline center |
| `/dashboard/notifications` | Notifications |
| `/dashboard/profile` | Profile |
| `/dashboard/settings` | Settings |
| `/admin` | Admin panel |

---

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Lucide React icons
- Inter font (Google Fonts)

---

## Design principles

- Trust + clarity + human-centered + professional + accessible
- No AI visual clichés (no gradients, glows, robot illustrations)
- Restrained color system: deep navy primary, muted teal accent
- Consistent spacing, typography hierarchy, subtle borders
- Skeleton loaders, meaningful empty states, human-friendly errors
- Fully responsive: sidebar on desktop, bottom nav on mobile
- Accessibility: semantic HTML, visible focus states, ARIA labels, keyboard navigation
