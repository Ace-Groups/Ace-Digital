# Deploy the API on Cloud Run

The Express API runs as Cloud Run service `ace-digital-api` in project `ace-digital-os`, region `asia-south1` (Mumbai). That region is Tier 1 pricing and is supported for a Firebase Hosting rewrite. Firestore already lives in `asia-south1`.

Billing is **request-based** (`--cpu-throttling`, the Cloud Run default): CPU is charged while a request is in flight, plus startup and shutdown. Minimum instances stay at **0**. There is no paid Render service and no keepalive ping.

The employee SPA stays on Firebase Hosting site `ace-digital-app`. Hosting rewrites `/api/**` and `/socket.io/**` to this service, so the browser calls `https://app.acedigital.cc` and `https://ace-digital-app.web.app` same-origin. Do not set `VITE_API_BASE_URL` for that build.

Cloud Firestore is the production source of truth. PostgreSQL is local development only. Cloud Functions stay in the project for push (`onNotificationCreated`, `onPushOutboxCreated`). They are not the public API.

Do not point `acedigital.cc` at this SPA.

## What you need first

1. `gcloud` logged in as an owner of `ace-digital-os`, and `firebase` CLI logged in to the same account.
2. A billing account linked to the project (Blaze). Cloud Run cannot be created on the Spark plan. Blaze has no flat monthly fee. Confirm, do not change the plan from this repository:

```bash
gcloud billing projects describe ace-digital-os --format='value(billingEnabled)'
```

3. Secret Manager secret `JWT_SECRET`. Firebase `functions:secrets:set JWT_SECRET` already creates this secret. Reuse it so existing sessions stay valid. If it is missing:

```bash
openssl rand -base64 48 | gcloud secrets create JWT_SECRET \
  --project=ace-digital-os --data-file=- --replication-policy=automatic
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
- creates runtime service account `ace-digital-api@ace-digital-os.iam.gserviceaccount.com` if needed
- grants that account Firestore, Storage, Firebase Auth admin, Realtime Database admin, and `serviceAccountTokenCreator` on itself (custom tokens)
- deploys from the root `Dockerfile` with `--min-instances=0`, `--max-instances=2`, `--cpu=1`, `--memory=512Mi`, `--concurrency=80`, `--timeout=300`, `--port=8080`, `--cpu-throttling` (request-based billing), `--cpu-boost` (startup only), and `--allow-unauthenticated`

The app still requires its own JWT. Public Cloud Run invoker is what lets Hosting and browsers reach the service.

Non-secret environment set by the script:

| Name | Value |
|------|--------|
| `USE_FIRESTORE` | `true` |
| `GCLOUD_PROJECT`, `FIREBASE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT` | `ace-digital-os` |
| `APP_URL` | `https://app.acedigital.cc` |
| `APP_LOGIN_URL` | `https://app.acedigital.cc/login` |
| `API_PUBLIC_URL` | `https://app.acedigital.cc` |
| `CORS_ORIGINS` | `https://app.acedigital.cc`, `https://ace-digital-app.web.app`, `https://ace-digital-app.firebaseapp.com` |
| `FIREBASE_STORAGE_BUCKET` | `ace-digital-os.firebasestorage.app` |

No `FIREBASE_SERVICE_ACCOUNT_JSON`. Cloud Run uses the runtime service account.

`REDIS_URL` is unset on purpose. Chat messages are written inline. Do not add Memorystore for a 12-person team.

If the revision is OOM-killed while booting, redeploy with `--memory=1Gi`.

### Alternate: Cloud Build config

`cloudbuild.api.yaml` builds the same image and deploys the same limits. Do not connect a trigger. Create the Artifact Registry repo once, then submit:

```bash
gcloud artifacts repositories create ace-digital \
  --repository-format=docker --location=asia-south1 --project=ace-digital-os
gcloud builds submit --config cloudbuild.api.yaml --project ace-digital-os
```

The shell script is the one that checks `JWT_SECRET` and mounts optional secrets. Prefer that.

## Deploy Hosting after the service exists

The rewrite fails if service `ace-digital-api` does not exist yet.

```bash
npx firebase-tools@latest hosting:sites:create ace-digital-app --project ace-digital-os
pnpm run deploy:hosting
```

`deploy:hosting` builds the SPA with no `VITE_API_BASE_URL` (same-origin `/api`) and deploys target `ace-digital-app`.

In Firebase Console → Hosting → `ace-digital-app` → Add custom domain `app.acedigital.cc`. Add the TXT and CNAME records Firebase shows. Leave the apex `acedigital.cc` records on the marketing site.

## Verify

```bash
curl -sS "https://ace-digital-app.web.app/api/healthz"
```

Expect `{"status":"ok"}`. The first request after idle can take a few seconds (cold start). Later requests in the same burst are faster.

Then log in at `https://ace-digital-app.web.app` (or `https://app.acedigital.cc` after DNS) and send a channel message.

## Cold starts

Minimum instances stay 0, so an idle service scales to zero. Mitigations that do not cost a warm instance:

- slim runtime image (`node:22-bookworm-slim`, bundle plus four native/external packages)
- the process calls `listen` before Redis or Firestore warmup
- BullMQ and ioredis load only when `REDIS_URL` is set
- `--cpu-boost` adds CPU during startup only

Do not add a cron ping. A ping on a timer keeps an instance billable and spends the free quota. Do not set min instances.

## WebSockets and the 60 second Hosting limit

Firebase Hosting ends a proxied request at 60 seconds. Normal API calls are shorter. An open Socket.IO connection counts as in-flight work for Cloud Run request-based billing for as long as it stays open.

If chat sockets fail through Hosting, rebuild the SPA with the Cloud Run URL (Cloud Run console → service → URL):

```bash
VITE_SOCKET_URL="https://ace-digital-api-HASH.asia-south1.run.app" pnpm run build:web:hosting
npx firebase-tools@latest deploy --only hosting:ace-digital-app --project ace-digital-os
```

Add that `https://….run.app` origin to `CORS_ORIGINS` on the service if you do this. Same-origin Hosting does not need it.

## Cost for this team

See [PRODUCTION.md](PRODUCTION.md). Short version: about **$0** when people use the app in bursts and do not leave chat connected all day. Leaving chat sockets open through the workday can land around **$5–11** because that CPU time is past the request-based free tier. Set a [budget alert](https://console.cloud.google.com/billing/budgets?project=ace-digital-os) at $10. Prefer an email alert over a hard spend cap: a spend cap pauses Cloud Run and the API starts returning 5xx.

## Render

Render is retired. Delete the `ace-digital-api` service in the Render dashboard if it is still there so it cannot be billed later. Nothing in this repo syncs a Render blueprint.
