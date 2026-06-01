# Firebase deployment (Ace Digital OS)

## Project

| Item | Value |
|------|--------|
| Firebase project ID | `ace-digital-os` |
| Console | https://console.firebase.google.com/project/ace-digital-os |
| Hosting URL | https://ace-digital-os.web.app |
| Database | Cloud Firestore `(default)` in `asia-south1` |
| Plan target | Spark (free) + Blaze only if you enable Cloud Functions |

## What is deployed

- **Firestore** — rules, indexes, and seed data (collections mirror the Postgres schema: `users`, `teams`, `projects`, `tasks`, `clients`, `approvals`, `expenses`, `payroll_runs`, `reports`, `channels`, `messages`, `activity_logs`, `employee_profiles`, `_meta/counters`).
- **Hosting** — production build of `artifacts/ace-digital-os` (SPA).
- **Cloud Functions (API)** — code is ready in `firebase/functions`, but deploy requires upgrading the Firebase project to the **Blaze** plan (billing account attached; you still pay $0 while within [free quotas](https://firebase.google.com/pricing)).

## Default login (after seed)

- Email: `admin@acedigital.com`
- Password: `Admin@123`

## One-time: enable API (Blaze)

1. Open https://console.firebase.google.com/project/ace-digital-os/usage/details  
2. Upgrade to **Blaze (pay as you go)** — required for Cloud Functions / Cloud Build on new projects.  
3. Deploy the API:

```bash
pnpm run build:api
cp artifacts/api-server/dist/api-app.mjs firebase/functions/api-app.mjs
cd firebase/functions && npm install && npm run build
cd ../..
npx firebase-tools@latest deploy --only functions --project ace-digital-os
```

4. Re-deploy hosting so `/api/**` rewrites resolve:

```bash
npx firebase-tools@latest deploy --only hosting --project ace-digital-os
```

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

## GitHub

Push application code to your org remote, then connect Firebase Hosting to GitHub for CI if desired (optional).
