# Firebase deployment (Ace Digital OS)

**Current production:** Cloud Firestore is the source of truth for all API data. REST runs on [Render](https://ace-digital-api.onrender.com). The employee SPA deploys to Firebase Hosting site `ace-digital-app`, intended for `https://app.acedigital.cc`. `https://acedigital.cc` is the public marketing site and is not this app. Deploy the frontend with `pnpm run deploy:hosting:render` after the site exists (see below). Cloud Functions remain in the project for optional `/api/**` rewrites but are bypassed when `VITE_API_BASE_URL` points to Render.

## Project

| Item | Value |
|------|--------|
| Firebase project ID | `ace-digital-os` |
| Console | https://console.firebase.google.com/project/ace-digital-os |
| Hosting site | `ace-digital-app` (target in `.firebaserc`) |
| Hosting URL | https://ace-digital-app.web.app and https://app.acedigital.cc |
| Database | Cloud Firestore `(default)` in `asia-south1` |
| API region | `asia-south1` (Gen 1 HTTPS function `api`) |
| Plan | Blaze (billing enabled) |

## What is deployed

- **Firestore** — rules, indexes, and seed data (collections mirror the Postgres schema: `users`, `teams`, `projects`, `tasks`, `clients`, `approvals`, `expenses`, `payroll_runs`, `reports`, `channels`, `messages`, `activity_logs`, `employee_profiles`, `_meta/counters`).
- **Hosting** — production build of `artifacts/ace-digital-os` (SPA).
- **Cloud Functions (API)** — Gen 1 HTTPS `api` in `asia-south1`; Hosting rewrites `/api/**` to this function.

## Firebase web app (chat client SDK)

The hosted app uses the Firebase **Web** app `Ace Digital OS` (`1:468590312757:web:90d5fa23bd3cb78e68e07c`). SDK values are embedded in `artifacts/ace-digital-os/src/lib/firebase-config.ts` (override with `VITE_FIREBASE_*` at build time if needed).

```bash
npx firebase-tools@latest apps:sdkconfig WEB 1:468590312757:web:90d5fa23bd3cb78e68e07c --project ace-digital-os
```

## Production login (single admin)

The ERP does not use Firebase Authentication email/password. Login checks a bcrypt hash on the Firestore `users` document. The password is not stored in this repository.

| Field | Value |
|-------|--------|
| Email | Set `ADMIN_EMAIL` if it is not `kavin@acedigital.cc`. Older notes also mentioned `kavin@acedigital.com`. Confirm the live document before rotating. |
| Password | `ADMIN_PASSWORD` in your shell only. At least 12 characters. Never commit it. |
| Job title | Managing Director |
| App role | `super_admin` (full access) |

Login (after Hosting is deployed): https://app.acedigital.cc/login

Refresh that admin without wiping other data:

```bash
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os \
  ADMIN_EMAIL='the-live-login-email' \
  ADMIN_PASSWORD='choose-a-new-password' \
  pnpm --filter @workspace/scripts run upsert:kavin
```

Requires [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) for `ace-digital-os` (`gcloud auth application-default login`). The script prints the email and does not print the password.

### Reset database to production baseline

Removes **all** demo data (projects, tasks, users, clients, etc.) and keeps only the admin account plus one Operations team:

```bash
CONFIRM_RESET=ace-digital-os USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-os \
  ADMIN_PASSWORD='choose-a-new-password' \
  pnpm --filter @workspace/scripts run reset:production
```

Requires [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) for `ace-digital-os` (e.g. `gcloud auth application-default login`). This wipes the database. To change only the password, use `upsert:kavin` above.

## One-time: create the employee Hosting site

The marketing site stays on `acedigital.cc`. The ERP uses a separate Hosting site:

```bash
npx firebase-tools@latest hosting:sites:create ace-digital-app --project ace-digital-os
pnpm run deploy:hosting:render
```

Then in Firebase Console → Hosting → `ace-digital-app` → Add custom domain `app.acedigital.cc`. Add the TXT and CNAME records Firebase shows. Do not change the apex DNS for `acedigital.cc`.

Deploy Storage rules in the same change so HR files are not world-readable to every signed-in user:

```bash
npx firebase-tools@latest deploy --only storage --project ace-digital-os
```

## One-time: enable Realtime Database (notes collaboration)

Collaborative notes use **Firebase RTDB** for Yjs sync (`note_collab/`, `note_acl/`). The first instance must be created once per project:

```bash
./scripts/enable-firebase-rtdb.sh
```

Or manually: [Firebase Console → Realtime Database](https://console.firebase.google.com/project/ace-digital-os/database) → **Create Database** → region **asia-southeast1** → locked mode, then:

```bash
firebase deploy --only database --project ace-digital-os
```

**databaseURL** (asia-southeast1): `https://ace-digital-os-default-rtdb.asia-southeast1.firebasedatabase.app`  
Set `VITE_FIREBASE_DATABASE_URL` at build time if your instance URL differs.

## Omnichannel push notifications

| Piece | Location |
|-------|----------|
| Token storage | Firestore `users/{userId}/user_tokens/{tokenId}` (API writes) |
| Dispatcher | Cloud Functions `onNotificationCreated`, `onPushOutboxCreated` |
| FCM web | `firebase-messaging-sw.js` + `VITE_FIREBASE_VAPID_KEY` |
| Expo mobile | `platform: "expo"` tokens via `POST /v1/push-tokens` |

### 1. Web push VAPID key

Firebase Console → Project settings → Cloud Messaging → **Web Push certificates** → Generate key pair.

```bash
# Build with VAPID (Render / local)
VITE_FIREBASE_VAPID_KEY=your_key pnpm run build:web:render
```

### 2. Deploy push functions

```bash
cd firebase/functions && npm run build && cd ../..
# Codebase name is "api" — use functions:api:<exportName>
firebase deploy --only functions:api:onNotificationCreated,functions:api:onPushOutboxCreated --project ace-digital-os
```

Or deploy the entire functions codebase:

```bash
firebase deploy --only functions:api --project ace-digital-os
```

Web push build (replace with your VAPID key from Firebase Console → Cloud Messaging):

```bash
VITE_FIREBASE_VAPID_KEY="YOUR_VAPID_KEY_HERE" pnpm run build:web:render
```

Also deploy Firestore rules: `firebase deploy --only firestore:rules`

Set optional `APP_ORIGIN=https://app.acedigital.cc` on functions for absolute deep links in push payloads.

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

## Security (production) — JWT secret

Firebase **deprecated** `functions.config()` in 2026. This project uses **Secret Manager** via `firebase-functions/params`.

### 1. Generate a secret (once)

```bash
openssl rand -base64 48
```

Copy the output (it will be longer than 32 characters).

### 2. Store it in Firebase (interactive — paste the generated value, not a placeholder)

```bash
firebase functions:secrets:set JWT_SECRET --project ace-digital-os
```

When prompted, paste the value from step 1.

### 3. Deploy functions (required after setting or rotating the secret)

```bash
pnpm run build:api
cp artifacts/api-server/dist/api-app.mjs firebase/functions/api-app.mjs
cd firebase/functions && npm run build && cd ../..
npx firebase-tools deploy --only functions --project ace-digital-os
```

Login and API calls will fail until `JWT_SECRET` is set and functions are redeployed.

### Employee email (Resend — recommended)

The API sends welcome and password-reset mail through **Resend** when `RESEND_API_KEY` is set. This is simpler than the Firebase Trigger Email extension (no SMTP/OAuth wizard).

**1. Create a Resend API key** at https://resend.com/api-keys and verify your sending domain (e.g. `mybexo.com` so `hr@mybexo.com` works).

**2. Store secrets (do not commit keys to git).** Run these in your terminal and paste values when prompted:

```bash
firebase functions:secrets:set RESEND_API_KEY --project ace-digital-os
firebase functions:secrets:set EMAIL_FROM --project ace-digital-os
```

For `EMAIL_FROM`, use a **verified** Resend sender, e.g. `Ace-Digital <hr@mybexo.com>` (must match a domain you verified in Resend).

**3. Redeploy functions** (this binds the secrets to the `api` function):

```bash
pnpm run build:api
cp artifacts/api-server/dist/api-app.mjs firebase/functions/api-app.mjs
cd firebase/functions && npm run build && cd ../..
npx firebase-tools deploy --only functions --project ace-digital-os
```

| Secret / env | Purpose |
|--------------|---------|
| `RESEND_API_KEY` | Resend API key (required for email) |
| `EMAIL_FROM` | Verified sender, e.g. `Ace-Digital <hr@mybexo.com>` |
| `APP_LOGIN_URL` | Optional; defaults to `https://app.acedigital.cc/login` |

If `RESEND_API_KEY` is missing, the API falls back to queuing docs in Firestore collection `mail` (only works if you installed [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email) with valid SMTP). **You can skip that extension entirely if you use Resend.**

**Who can reset passwords:** `super_admin`, `management`, and `hr` (`employees:password_reset`) — send reset email or set a manual temporary password from the employee card menu.

CORS is restricted to Ace Digital hosting URLs and localhost dev ports.

### API URLs (do not open the function root in a browser for the app)

| Use | URL |
|-----|-----|
| **Web app (login here)** | https://app.acedigital.cc |
| **API via hosting** | https://app.acedigital.cc/api/v1/... only if Hosting still rewrites `/api/**`. The SPA calls Render directly. |
| **Function health check** | https://asia-south1-ace-digital-os.cloudfunctions.net/api/api/healthz |
| **Function root (info JSON only)** | https://asia-south1-ace-digital-os.cloudfunctions.net/api |

Opening `…cloudfunctions.net/api` in Safari shows API metadata JSON after deploy — not the React app.

## Deploy troubleshooting

- **Hosting** `Assertion failed: resolving hosting target...` — `firebase.json` must include `"site": "ace-digital-os"` under `hosting`.
- **Functions** `...-compute@developer.gserviceaccount.com doesn't exist` — the `api` function uses `firebase-adminsdk-fbsvc@ace-digital-os.iam.gserviceaccount.com` in `firebase/functions/src/index.ts` (`runWith`) so custom tokens and Admin SDK calls work.
- **`/api/v1/auth/firebase-custom-token` returns 503** — the function’s service account must be allowed to mint custom tokens. One-time IAM (replace project ID if needed):

```bash
gcloud iam service-accounts add-iam-policy-binding firebase-adminsdk-fbsvc@ace-digital-os.iam.gserviceaccount.com \
  --project=ace-digital-os \
  --member="serviceAccount:ace-digital-os@appspot.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
gcloud iam service-accounts add-iam-policy-binding ace-digital-os@appspot.gserviceaccount.com \
  --project=ace-digital-os \
  --member="serviceAccount:ace-digital-os@appspot.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```
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

## Architecture (production)

| Component | Role |
|-----------|------|
| **Firestore** | Production database and realtime chat transport; API on Render uses Admin SDK (`FIREBASE_SERVICE_ACCOUNT_JSON`). Client writes are denied. |
| **Hosting** | SPA on site `ace-digital-app` (`https://ace-digital-app.web.app`, custom domain `https://app.acedigital.cc`). Build with `pnpm run build:web:render`. |
| **Render (`ace-digital-api`)** | REST `/api/*`; see [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md). |
| **Cloud Functions (gen 1)** | Legacy bundled API for Hosting `/api/**` rewrite; unused when the SPA calls Render via `VITE_API_BASE_URL`. |

Cloud Firestore is the production source of truth (`USE_FIRESTORE=true` on Render). Postgres (`DATABASE_URL`) is for local development only. Local dev runs the API server on port 8080.

Full diagram and deploy commands: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**. Chat: **[docs/CHAT.md](docs/CHAT.md)**.

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

Permissions are defined in `lib/rbac` and enforced by the API. Firestore rules allow authenticated channel members **read-only** access to mirrored messages and channel activity; writes remain server-only.

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
