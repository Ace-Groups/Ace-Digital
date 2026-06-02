# Firebase deployment (Ace Digital OS)

## Project

| Item | Value |
|------|--------|
| Firebase project ID | `ace-digital-os` |
| Console | https://console.firebase.google.com/project/ace-digital-os |
| Hosting URL | https://ace-digital-os.web.app |
| Database | Cloud Firestore `(default)` in `asia-south1` |
| API region | `asia-south1` (Gen 1 HTTPS function `api`) |
| Plan | Blaze (billing enabled) |

## What is deployed

- **Firestore** — rules, indexes, and seed data (collections mirror the Postgres schema: `users`, `teams`, `projects`, `tasks`, `clients`, `approvals`, `expenses`, `payroll_runs`, `reports`, `channels`, `messages`, `activity_logs`, `employee_profiles`, `_meta/counters`).
- **Hosting** — production build of `artifacts/ace-digital-os` (SPA).
- **Cloud Functions (API)** — Gen 1 HTTPS `api` in `asia-south1`; Hosting rewrites `/api/**` to this function.

## Production login (single admin)

| Field | Value |
|-------|--------|
| Email | `kavin@acedigital.com` |
| Password | `Kavin@2026` |
| Job title | Managing Director |
| App role | `super_admin` (full access) |

Login: https://ace-digital-os.web.app

### Reset database to production baseline

Removes **all** demo data (projects, tasks, users, clients, etc.) and keeps only the Kavin admin account plus one Operations team:

```bash
CONFIRM_RESET=ace-digital-os USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os \
  pnpm --filter @workspace/scripts run reset:production
```

Requires [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) for `ace-digital-os` (e.g. `gcloud auth application-default login`).

Refresh a single admin without wiping data:

```bash
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run upsert:kavin
```

## One-time: enable API (Blaze) — required

Your project must show **billing enabled**. Check:

```bash
gcloud billing projects describe ace-digital-os --format='value(billingEnabled)'
```

Must return `True`. If `False`, complete these steps:

1. Open https://console.firebase.google.com/project/ace-digital-os/usage/details  
2. Click **Modify plan** → **Blaze (pay as you go)**.  
3. Link a Google Cloud **billing account** (credit/debit card). You are **not** charged a flat monthly Firebase fee.  
4. Wait 2–5 minutes, then deploy the API:

```bash
pnpm run build:api
cp artifacts/api-server/dist/api-app.mjs firebase/functions/api-app.mjs
cd firebase/functions && npm install && npm run build
cd ../..
npx firebase-tools@latest deploy --only functions --project ace-digital-os
```

5. Re-deploy hosting so `/api/**` rewrites resolve:

```bash
npx firebase-tools@latest deploy --only hosting --project ace-digital-os
```

## Security (production)

Set a strong JWT secret (32+ random characters) before deploying functions:

```bash
firebase functions:config:set app.jwt_secret="YOUR_LONG_RANDOM_SECRET" --project ace-digital-os
pnpm run deploy:firebase
```

Without this, the API falls back to a dev-only secret and logs a warning. CORS is restricted to Ace Digital hosting URLs and localhost dev ports.

## Deploy troubleshooting

- **Hosting** `Assertion failed: resolving hosting target...` — `firebase.json` must include `"site": "ace-digital-os"` under `hosting`.
- **Functions** `...-compute@developer.gserviceaccount.com doesn't exist` — use `serviceAccount: "ace-digital-os@appspot.gserviceaccount.com"` in `firebase/functions/src/index.ts` (`runWith`).
- **Artifact cleanup policy** (non-fatal after a successful deploy) — run `npx firebase-tools functions:artifacts:setpolicy --project ace-digital-os` or deploy functions with `--force`.

## Local commands

```bash
# Install deps
pnpm install

# Build web + API bundles
pnpm run build:web
pnpm run build:api

# Seed Firestore (production)
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os pnpm --filter @workspace/scripts run seed:firestore

# Full deploy (after Blaze)
pnpm run deploy:firebase
```

## Architecture (lowest cost)

- **Firestore** — NoSQL; Spark free tier (50K reads / 20K writes per day). All business data stays server-side via Cloud Functions (Admin SDK); clients never touch Firestore directly (`firestore.rules` denies client access).
- **Hosting** — Free CDN + SSL.
- **Cloud Functions (gen 1)** — `asia-south1`, 512MB, max 10 instances — Express app bundled as `api-app.mjs` using `USE_FIRESTORE=true`.

Postgres (`DATABASE_URL`) is still supported locally for development; production Firebase uses Firestore only.

## Estimated monthly cost (Ace Digital OS, small team)

Blaze means **billing is attached**, not that you pay every month. For a small internal app (~5–15 users, light usage), you typically stay in **free quotas**:

| Service | Free quota (typical) | Your likely usage |
|---------|----------------------|-------------------|
| Hosting | 10 GB storage, ~360 MB/day transfer | Well within free |
| Firestore | 50K reads / 20K writes per day | Well within free |
| Cloud Functions | 2M invocations/month (Gen 1) | Well within free |
| Cloud Build | 120 build-min/day | Only when you deploy |

**Realistic estimate:** **$0–3/month** for light internal use. Charges appear only if you exceed free limits (heavy traffic, many builds, or large Firestore reads). Set a [budget alert](https://console.cloud.google.com/billing/budgets) at $5–10 in Google Cloud Console to get email warnings.

There is **no** fixed “Blaze monthly fee” — you pay for usage above free tier only.

## Role-based access control (RBAC)

Permissions are defined in `lib/rbac` and enforced by the API (Cloud Functions). Firestore rules remain **deny-all** for clients; the browser never reads Firestore directly.

### Roles (7)

| Role | Summary |
|------|---------|
| `super_admin` | Full access; only role that can assign `super_admin` |
| `management` | Org operations, projects, teams, most approvals, reports |
| `finance` | Salaries, expenses, payroll; approves `EXPENSE`, `PROJECT_BUDGET` |
| `hr` | Employee records **without salary fields**; approves `LEAVE`, `HIRING` |
| `client_manager` | Clients CRUD; read linked projects |
| `team_lead` | Team-scoped projects/tasks; approves team `LEAVE` |
| `employee` | Own tasks, profile, payslip only (no employee directory) |

### Approval types (single step)

| Type | Approvers |
|------|-----------|
| `LEAVE` | Same-team `team_lead`, `hr`, `management`, `super_admin` |
| `EXPENSE` | `finance`, `management`, `super_admin` |
| `PROJECT_BUDGET` | `management`, `super_admin` |
| `HIRING` | `hr`, `management`, `super_admin` |
| `OTHER` | `management`, `super_admin` |

### Manual smoke checklist (dev)

After seeding test users (`pnpm --filter @workspace/scripts run seed:rbac-dev` with Firestore or local Postgres):

1. **employee** — `GET /v1/employees` → 403; `GET /v1/me` → 200; dashboard has no revenue/headcount widgets.
2. **team_lead** — cannot approve `EXPENSE`; can approve team `LEAVE`.
3. **finance** — cannot approve `LEAVE`; can approve `EXPENSE`.
4. **hr** — employee list has no `baseSalary` / `bonus` fields.
5. **client_manager** — Clients write OK; no Tasks nav.

Unit tests: `pnpm --filter @workspace/rbac run test`.

## GitHub

Push application code to your org remote, then connect Firebase Hosting to GitHub for CI if desired (optional).
