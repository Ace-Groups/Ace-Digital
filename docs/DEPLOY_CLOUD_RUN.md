# Deploy the API on Cloud Run

The Express API runs as Cloud Run service `ace-digital-api` in project `ace-digital-int-12345` (display name Ace Digital Int), region `asia-south1` (Mumbai). That region is Tier 1 pricing and is supported for a Firebase Hosting rewrite. Create the default Firestore database in `asia-south1` if the console asks. The database starts empty; run `bootstrap:owner` after the API can reach it.

Billing is **request-based** (`--cpu-throttling`, the Cloud Run default): CPU is charged while a request is in flight, plus startup and shutdown. Minimum instances stay at **0**. There is no paid Render service and no keepalive ping.

The employee SPA uses the project's default Hosting site `ace-digital-int-12345` (not a second site named `ace-digital-app`). Hosting rewrites `/api/**` to this service, so the browser calls `https://app.acedigital.cc`, `https://ace-digital-int-12345.web.app`, and `https://ace-digital-int-12345.firebaseapp.com` same-origin. Do not set `VITE_API_BASE_URL` for that build. Chat delivery is a Firestore listener, not a Cloud Run socket. Listeners start only after the Hosting build includes this project's web SDK config.

Cloud Firestore is the production source of truth. PostgreSQL is local development only. Cloud Functions stay in the project for push (`onNotificationCreated`, `onPushOutboxCreated`). They are not the public API.

Do not point `acedigital.cc` at this SPA.

## What you need first

1. `gcloud` logged in as an owner of `ace-digital-int-12345` (`admin@acedigital.cc`), and `firebase` CLI logged in to the same account.
2. A billing account linked to the project (Blaze). Cloud Run cannot be created on the Spark plan. Blaze has no flat monthly fee. Confirm, do not change the plan from this repository:

```bash
gcloud billing projects describe ace-digital-int-12345 --format='value(billingEnabled)'
```

3. Secret Manager secret `JWT_SECRET`. Firebase `functions:secrets:set JWT_SECRET` already creates this secret. Reuse it so existing sessions stay valid. If it is missing:

```bash
openssl rand -base64 48 | gcloud secrets create JWT_SECRET \
  --project=ace-digital-int-12345 --data-file=- --replication-policy=automatic
```

The command reads the value from stdin and does not print it. Do not commit it.

Optional secrets, created the same way only if you use that feature: `RESEND_API_KEY`, `GEMINI_API_KEY`, `GEMINI_API_KEY_FALLBACK`, `OPENROUTER_API_KEY`, `FIREBASE_WEB_PUSH_VAPID_KEY`, `CREDENTIAL_HMAC_SECRET`. The deploy script mounts whichever of these already exist. It never creates them from a file in git.

## Deploy the API

From the repository root:

```bash
ACE_DEPLOY_CLOUD_RUN=1 pnpm run deploy:cloud-run
```

That runs `scripts/deploy-cloud-run.sh`, which:

- exits if `JWT_SECRET` is missing
- enables the Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs
- creates runtime service account `ace-digital-api@ace-digital-int-12345.iam.gserviceaccount.com` if needed
- grants that account Firestore, Storage, Firebase Auth admin, Realtime Database admin, and `serviceAccountTokenCreator` on itself (custom tokens)
- deploys from the root `Dockerfile` with `--min-instances=0`, `--max-instances=2`, `--cpu=1`, `--memory=512Mi`, `--concurrency=80`, `--timeout=300`, `--port=8080`, `--cpu-throttling` (request-based billing), `--cpu-boost` (startup only), and `--allow-unauthenticated`

The app still requires its own JWT. Public Cloud Run invoker is what lets Hosting and browsers reach the service.

Non-secret environment set by the script:

| Name | Value |
|------|--------|
| `USE_FIRESTORE` | `true` |
| `GCLOUD_PROJECT`, `FIREBASE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT` | `ace-digital-int-12345` |
| `APP_URL` | `https://app.acedigital.cc` |
| `APP_LOGIN_URL` | `https://app.acedigital.cc/login` |
| `API_PUBLIC_URL` | `https://app.acedigital.cc` |
| `CORS_ORIGINS` | `https://app.acedigital.cc`, `https://ace-digital-int-12345.web.app`, `https://ace-digital-int-12345.firebaseapp.com` |
| `FIREBASE_STORAGE_BUCKET` | `ace-digital-int-12345.firebasestorage.app` |
| `FIREBASE_DATABASE_URL` | `https://ace-digital-int-12345-default-rtdb.asia-southeast1.firebasedatabase.app` |

No `FIREBASE_SERVICE_ACCOUNT_JSON`. Cloud Run uses the runtime service account.

`REDIS_URL` is unset on purpose. Chat messages are written inline. Do not add Memorystore for a 12-person team.

If the revision is OOM-killed while booting, redeploy with `--memory=1Gi`.

### Alternate: Cloud Build config

`cloudbuild.api.yaml` builds the same image and deploys the same limits. Do not connect a trigger. Create the Artifact Registry repo once, then submit:

```bash
gcloud artifacts repositories create ace-digital \
  --repository-format=docker --location=asia-south1 --project=ace-digital-int-12345
gcloud builds submit --config cloudbuild.api.yaml --project ace-digital-int-12345
```

The shell script is the one that checks `JWT_SECRET` and mounts optional secrets. Prefer that.

## Deploy Hosting after the service exists

The rewrite fails if service `ace-digital-api` does not exist yet.

Create the web app once and export its SDK config into the build. Those values are not in git. Without `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_MESSAGING_SENDER_ID`, the SPA still loads and chat polls.

```bash
npx firebase-tools@latest apps:create WEB "Ace Digital Int" --project ace-digital-int-12345
npx firebase-tools@latest apps:sdkconfig WEB --project ace-digital-int-12345
```

The default Hosting site id is the project id. Do not create `ace-digital-app`.

```bash
pnpm run deploy:hosting
```

`deploy:hosting` builds the SPA with no `VITE_API_BASE_URL` (same-origin `/api`) and deploys site `ace-digital-int-12345`.

In Firebase Console → Hosting → site `ace-digital-int-12345` → Add custom domain `app.acedigital.cc`. Add the TXT and CNAME records Firebase shows. The usual CNAME is host `app` pointing at `ace-digital-int-12345.web.app`. Leave the apex `acedigital.cc` records on the marketing site.

## Bootstrap the empty database

After Cloud Run is up (or with ADC from your laptop against the same project):

```bash
USE_FIRESTORE=true GOOGLE_CLOUD_PROJECT=ace-digital-int-12345 \
  ADMIN_EMAIL='admin@acedigital.cc' \
  ADMIN_PASSWORD='at-least-12-characters' \
  pnpm --filter @workspace/scripts run bootstrap:owner
```

That creates the Operations team, the owner (`super_admin`), the employee profile, and base counters. It does not wipe data and it does not print the password. Deploy rules in the same change:

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage --project ace-digital-int-12345
```

## Verify

```bash
curl -sS "https://ace-digital-int-12345.web.app/api/healthz"
```

Expect `{"status":"ok"}`. The first request after idle can take a few seconds (cold start). Later requests in the same burst are faster.

Then log in at `https://ace-digital-int-12345.web.app` (or `https://app.acedigital.cc` after DNS) with `ADMIN_EMAIL` and send a channel message.

## Cold starts

Minimum instances stay 0, so an idle service scales to zero. Mitigations that do not cost a warm instance:

- slim runtime image (`node:22-bookworm-slim`, bundle plus four native/external packages)
- the process calls `listen` before Redis or Firestore warmup
- BullMQ and ioredis load only when `REDIS_URL` is set
- `--cpu-boost` adds CPU during startup only

Do not add a cron ping. A ping on a timer keeps an instance billable and spends the free quota. Do not set min instances.

## Chat

Sends are `POST /api/v1/channels/:id/messages`. After login the SPA exchanges its JWT for a Firebase custom token (`GET /api/v1/auth/firebase-custom-token`) and listens with `onSnapshot` on `channels/{channelId}/messages`. Rules allow that read only when `channel_member_index/{channelId}_{userId}` exists for the caller. Client writes are denied.

The deploy script grants the runtime service account `roles/iam.serviceAccountTokenCreator` on itself so it can mint those tokens. If minting fails, the chat page polls every 5 seconds while the tab is visible.

There is no `/socket.io` rewrite. Do not add one.

## Cost for this team

See [PRODUCTION.md](PRODUCTION.md). For this 12-person team the expected Cloud Run bill is about **$0**: requests are short, and chat no longer holds an instance open. Firestore listener reads for this volume stay inside the Firestore free quota. Set a [budget alert](https://console.cloud.google.com/billing/budgets?project=ace-digital-int-12345) at $10. Prefer an email alert over a hard spend cap: a spend cap pauses Cloud Run and the API starts returning 5xx.

## Render

Render is retired. Delete the `ace-digital-api` service in the Render dashboard if it is still there so it cannot be billed later. Nothing in this repo syncs a Render blueprint.
