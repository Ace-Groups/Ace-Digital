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

## GitHub

Push application code to your org remote, then connect Firebase Hosting to GitHub for CI if desired (optional).
