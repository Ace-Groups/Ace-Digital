# Firebase deployment (Ace Digital Int)

**Current production:** Firebase / GCP project `ace-digital-int-12345` (display name Ace Digital Int). Cloud Firestore is the source of truth for all API data. The Express API deploys to Cloud Run service `ace-digital-api` in `asia-south1` (minimum instances 0, request-based billing). The SPA is served by the project's **default Hosting site** `ace-digital-int-12345`. That site is created with the project, so there is no second site named `ace-digital-app`. Hosting rewrites `/api/**` to Cloud Run. Public URLs are `https://ace-digital-int-12345.web.app`, `https://ace-digital-int-12345.firebaseapp.com`, and the custom domain `https://app.acedigital.cc`. Chat updates use Firestore listeners after the API mints a Firebase custom token at login. `https://acedigital.cc` is the public marketing site and is not this app. Commands: [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md). Cloud Functions remain only for push notifications.

## Project

| Item | Value |
|------|--------|
| Firebase project ID | `ace-digital-int-12345` |
| Display name | Ace Digital Int |
| Console | https://console.firebase.google.com/project/ace-digital-int-12345 |
| Hosting site | Default site `ace-digital-int-12345` (`"site"` in `firebase.json`) |
| Hosting URL | https://ace-digital-int-12345.web.app, https://ace-digital-int-12345.firebaseapp.com, and https://app.acedigital.cc |
| Storage bucket | `ace-digital-int-12345.firebasestorage.app` |
| Realtime Database | `ace-digital-int-12345-default-rtdb` in `asia-southeast1` |
| Database | Cloud Firestore `(default)` in `asia-south1` |
| API | Cloud Run `ace-digital-api` in `asia-south1` |
| Owner login | `admin@acedigital.cc` (Firestore bcrypt user, not Firebase Authentication) |
| Plan | Blaze (billing enabled) |

## What is deployed

- **Firestore** — rules, indexes, and seed data (collections mirror the Postgres schema: `users`, `teams`, `projects`, `tasks`, `clients`, `approvals`, `expenses`, `payroll_runs`, `reports`, `channels`, `messages`, `activity_logs`, `employee_profiles`, `_meta/counters`).
- **Hosting** — production build of `artifacts/ace-digital-os` (SPA).
- **Cloud Run** — Express API `ace-digital-api` in `asia-south1`. Hosting rewrites `/api/**` here. Chat does not keep a socket open.
- **Cloud Functions** — push only (`onNotificationCreated`, `onPushOutboxCreated`). Not the public API.

## Empty Firestore bootstrap

`ace-digital-int-12345` starts with an empty Firestore. This creates `teams/1` (Operations) if it is missing, upserts the owner by email, ensures `employee_profiles/{userId}`, and fills any missing `_meta/counters` keys. It does not delete data and it does not print the password.

```bash
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 \
  ADMIN_EMAIL='admin@acedigital.cc' \
  ADMIN_PASSWORD='at-least-12-characters' \
  pnpm --filter @workspace/scripts run bootstrap:owner
```

Requires [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) for `ace-digital-int-12345` (`gcloud auth application-default login`). `ADMIN_PASSWORD` must be at least 12 characters. Optional `ADMIN_FULL_NAME` (default `Admin`) and `ADMIN_JOB_TITLE` (default `Owner`). Running it again updates that user's password and role.

Do not use `pnpm --filter @workspace/scripts run seed:firestore` as the first command. That script inserts demo users and demo passwords.

## Firebase web app (chat client SDK)

The web API key, app id, and messaging sender id are created inside `ace-digital-int-12345`. They are not in this repository. The previous project's web SDK config must not be copied here. Until a Hosting build includes the three values below, `isFirebaseConfigured()` is false: chat polls every 5 seconds while the tab is visible, and web push stays off.

```bash
npx firebase-tools@latest apps:create WEB "Ace Digital Int" --project ace-digital-int-12345
npx firebase-tools@latest apps:sdkconfig WEB --project ace-digital-int-12345
```

Pass the printed values into the Hosting build (see `docs/env.production.example`):

```bash
VITE_FIREBASE_API_KEY='...' \
VITE_FIREBASE_APP_ID='...' \
VITE_FIREBASE_MESSAGING_SENDER_ID='...' \
VITE_FIREBASE_PROJECT_ID=ace-digital-int-12345 \
VITE_FIREBASE_AUTH_DOMAIN=ace-digital-int-12345.firebaseapp.com \
VITE_FIREBASE_STORAGE_BUCKET=ace-digital-int-12345.firebasestorage.app \
pnpm run build:web:hosting
```

`public/firebase-messaging-sw.js` does not embed a project config. The page registers it with the same build-time values on the query string.

## Production login (owner)

The ERP does not use Firebase Authentication email/password. Login checks a bcrypt hash on the Firestore `users` document. Changing the password in the Firebase Authentication console does not change this login. The password is not stored in this repository.

| Field | Value |
|-------|--------|
| Email | `ADMIN_EMAIL`, default `admin@acedigital.cc` |
| Password | `ADMIN_PASSWORD` in your shell only. At least 12 characters. Never commit it. |
| Job title | `ADMIN_JOB_TITLE`, default `Owner` |
| App role | `super_admin` (full access) |

Login (after Hosting is deployed): https://app.acedigital.cc/login

`bootstrap:owner` is the command for a new or empty project. `upsert:kavin` still updates one user by `ADMIN_EMAIL` (its default email remains `kavin@acedigital.cc`) and does not create the Operations team or counters.

### Reset database to production baseline

Removes **all** app data (projects, tasks, users, clients, etc.) and keeps only the admin account plus one Operations team. `CONFIRM_RESET` must equal the project id.

```bash
CONFIRM_RESET=ace-digital-int-12345 USE_FIRESTORE=true \
  GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 \
  ADMIN_EMAIL='admin@acedigital.cc' \
  ADMIN_PASSWORD='choose-a-new-password' \
  pnpm --filter @workspace/scripts run reset:production
```

This wipes the database. To change only the password, run `bootstrap:owner` again.

## Hosting site

The employee app uses the default Hosting site `ace-digital-int-12345`. Do not create `ace-digital-app`. The marketing site stays on `acedigital.cc`.

```bash
pnpm run deploy:hosting
```

That builds the SPA and runs `firebase deploy --only hosting --project ace-digital-int-12345`. Deploy Cloud Run first so the `/api/**` rewrite has a service to call.

Then in Firebase Console → Hosting → site `ace-digital-int-12345` → Add custom domain `app.acedigital.cc`. Add the TXT and CNAME records Firebase shows. The CNAME host is `app` and the target is `ace-digital-int-12345.web.app` unless Firebase prints a different value. Do not change the apex DNS for `acedigital.cc`.

Deploy Storage and Firestore rules so HR files and chat reads match this repo:

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage --project ace-digital-int-12345
```

## One-time: enable Realtime Database (notes collaboration)

Collaborative notes use **Firebase RTDB** for Yjs sync (`note_collab/`, `note_acl/`). The first instance must be created once per project:

```bash
./scripts/enable-firebase-rtdb.sh
```

Or manually: [Firebase Console → Realtime Database](https://console.firebase.google.com/project/ace-digital-int-12345/database) → **Create Database** → region **asia-southeast1** → locked mode, then:

```bash
firebase deploy --only database --project ace-digital-int-12345
```

Instance name in `firebase.json`: `ace-digital-int-12345-default-rtdb`.  
**databaseURL** (asia-southeast1): `https://ace-digital-int-12345-default-rtdb.asia-southeast1.firebasedatabase.app`  
The client defaults to that URL from the project id. Set `VITE_FIREBASE_DATABASE_URL` only if the instance URL differs. Cloud Run sets `FIREBASE_DATABASE_URL` to the same value.

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
# Build with VAPID (Hosting / local)
VITE_FIREBASE_VAPID_KEY=your_key pnpm run build:web:hosting
```

### 2. Deploy push functions

```bash
cd firebase/functions && npm run build && cd ../..
# Codebase name is "api" — use functions:api:<exportName>
firebase deploy --only functions:api:onNotificationCreated,functions:api:onPushOutboxCreated --project ace-digital-int-12345
```

Or deploy the entire functions codebase:

```bash
firebase deploy --only functions:api --project ace-digital-int-12345
```

Web push build (replace with your VAPID key from Firebase Console → Cloud Messaging):

```bash
VITE_FIREBASE_VAPID_KEY="YOUR_VAPID_KEY_HERE" pnpm run build:web:hosting
```

Also deploy Firestore rules: `firebase deploy --only firestore:rules`

Set optional `APP_ORIGIN=https://app.acedigital.cc` on functions for absolute deep links in push payloads.

## One-time: enable API (Blaze) — required

Your project must show **billing enabled**. Check:

```bash
gcloud billing projects describe ace-digital-int-12345 --format='value(billingEnabled)'
```

Must return `True`. If `False`, complete these steps:

1. Open https://console.firebase.google.com/project/ace-digital-int-12345/usage/details  
2. Click **Modify plan** → **Blaze (pay as you go)**.  
3. Link a Google Cloud **billing account** (credit/debit card). You are **not** charged a flat monthly Firebase fee.  
4. Wait a few minutes, then deploy Cloud Run and Hosting. Cloud Run is what requires Blaze. Full command list: [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md).

```bash
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
pnpm run deploy:hosting
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
firebase functions:secrets:set JWT_SECRET --project ace-digital-int-12345
```

When prompted, paste the value from step 1.

### 3. Mount it on Cloud Run

`firebase functions:secrets:set` stores `JWT_SECRET` in Secret Manager. Cloud Run reads that same secret. After creating or rotating it:

```bash
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
```

Login fails until that secret exists and the Cloud Run revision has started. Push functions do not serve `/api`.

### Employee email (Resend — recommended)

The API sends welcome and password-reset mail through **Resend** when `RESEND_API_KEY` is set. This is simpler than the Firebase Trigger Email extension (no SMTP/OAuth wizard).

**1. Create a Resend API key** at https://resend.com/api-keys and verify your sending domain (e.g. `mybexo.com` so `hr@mybexo.com` works).

**2. Store secrets (do not commit keys to git).** Run these in your terminal and paste values when prompted:

```bash
firebase functions:secrets:set RESEND_API_KEY --project ace-digital-int-12345
firebase functions:secrets:set EMAIL_FROM --project ace-digital-int-12345
```

For `EMAIL_FROM`, use a **verified** Resend sender, e.g. `Ace-Digital <hr@mybexo.com>` (must match a domain you verified in Resend).

**3. Redeploy functions** (this binds the secrets to the `api` function):

```bash
pnpm run build:api
cp artifacts/api-server/dist/api-app.mjs firebase/functions/api-app.mjs
cd firebase/functions && npm run build && cd ../..
npx firebase-tools deploy --only functions --project ace-digital-int-12345
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
| **API via Hosting** | https://app.acedigital.cc/api/v1/... and https://ace-digital-int-12345.web.app/api/v1/... |
| **Health check** | https://ace-digital-int-12345.web.app/api/healthz |

The SPA calls same-origin `/api`. It does not call a separate API host.

## Deploy troubleshooting

- **Hosting** deploy with `firebase deploy --only hosting --project ace-digital-int-12345`. `firebase.json` sets `"site": "ace-digital-int-12345"` (the default site). There is no Hosting target in `.firebaserc`.
- **`/api/v1/auth/firebase-custom-token` returns 503** — the Cloud Run runtime service account must mint custom tokens. `scripts/deploy-cloud-run.sh` grants `roles/iam.serviceAccountTokenCreator` on `ace-digital-api@ace-digital-int-12345.iam.gserviceaccount.com` to itself. The public API is Cloud Run, not the gen1 `api` function. That function does not pin a service-account email, because the Firebase Admin SDK account suffix is assigned when the project is created and is not known here.
- **Artifact cleanup policy** (non-fatal after a successful deploy) — run `npx firebase-tools functions:artifacts:setpolicy --project ace-digital-int-12345` or deploy functions with `--force`.

## Local commands

```bash
# Install deps
pnpm install

# Build web + API bundles
pnpm run build:web
pnpm run build:api

# Empty Firestore: owner, Operations team, counters (does not wipe)
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 \
  ADMIN_EMAIL='admin@acedigital.cc' \
  ADMIN_PASSWORD='at-least-12-characters' \
  pnpm --filter @workspace/scripts run bootstrap:owner

# API + Hosting (after Blaze and JWT_SECRET). See docs/DEPLOY_CLOUD_RUN.md
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
pnpm run deploy:hosting
```

## Architecture (production)

| Component | Role |
|-----------|------|
| **Firestore** | Production database and realtime chat transport. Cloud Run uses Application Default Credentials (its runtime service account). Client writes are denied. |
| **Hosting** | SPA on the default site `ace-digital-int-12345` (`https://ace-digital-int-12345.web.app`, custom domain `https://app.acedigital.cc`). Build with `pnpm run build:web:hosting`. Rewrites `/api/**` to Cloud Run. |
| **Cloud Run (`ace-digital-api`)** | REST in `asia-south1`. Minimum instances 0, request-based billing. Chat sends go through this API; live updates are Firestore listeners. See [docs/DEPLOY_CLOUD_RUN.md](docs/DEPLOY_CLOUD_RUN.md). |
| **Cloud Functions (gen 1)** | Push notifications only. Not the public `/api` route. |

Cloud Firestore is the production source of truth (`USE_FIRESTORE=true` on Cloud Run). Postgres (`DATABASE_URL`) is for local development only. Local dev runs the API server on port 8080.

Full diagram and deploy commands: **[docs/PRODUCTION.md](docs/PRODUCTION.md)**. Chat: **[docs/CHAT.md](docs/CHAT.md)**.

## Estimated monthly cost (Ace Digital OS, small team)

Blaze means **billing is attached**, not that you pay every month. Cloud Run requires it. There is no fixed Blaze fee. The worked example for 12 people is in [docs/PRODUCTION.md](docs/PRODUCTION.md): about **$0**. Chat uses Firestore listeners, so an open chat page does not keep a Cloud Run instance running.

| Service | Free quota (typical) | Your likely usage |
|---------|----------------------|-------------------|
| Hosting | 10 GB storage, ~360 MB/day transfer | Well within free |
| Firestore | 50K reads / 20K writes per day | Well within free |
| Cloud Run (request-based) | 180,000 vCPU-seconds, 360,000 GiB-seconds, 2M requests | About $0. Chat does not hold an instance |
| Cloud Functions | 2M invocations/month (push only) | Well within free |
| Cloud Build | 120 build-min/day | Only when you deploy |

Set a [budget alert](https://console.cloud.google.com/billing/budgets) at $10. Use email, not a hard spend cap. A spend cap pauses Cloud Run and the API returns 5xx.

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
