# Deploy API + WebSocket on Render (free tier)

**Live service:** https://ace-digital-api.onrender.com — paired with Firebase Hosting; see **[PRODUCTION.md](PRODUCTION.md)** for end-to-end deploy and verify.

One Render **web service** runs Express REST and WebSocket chat on `/ws` (same as local `api-server`). **Redis Cloud** is optional on this layout; chat works via the in-process hub. Set `REDIS_URL` if you want pub/sub ready for a second consumer later.

## 1. Redis Cloud (`REDIS_URL`)

In Redis Cloud → database → **Connect**:

- Use the **TLS** URL (port `14421`).
- Format for Render:

```bash
rediss://default:YOUR_PASSWORD@redis-14421.crce280.asia-south1-1.gcp.cloud.redislabs.com:14421
```

Paste as `REDIS_URL` in Render environment (never commit the password).

**Security:** If your password appeared in a terminal log or chat, rotate it in Redis Cloud → database → Security.

## 2. Firebase Admin on Render

Download a Firebase **service account** JSON (Project settings → Service accounts → Generate new private key).

In Render → **Environment** → add:

| Key | Value |
|-----|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire JSON file as **one line** |
| `USE_FIRESTORE` | `true` |
| `GCLOUD_PROJECT` | `ace-digital-os` |
| `JWT_SECRET` | Same secret as production auth (32+ chars) |

## Render build failures (read this)

| Error | Root cause | Fix |
|-------|------------|-----|
| `EROFS` on `/usr/bin/pnpm` | `corepack enable` or `npm install -g pnpm` | Never use global pnpm on Render |
| `ERR_PNPM_OUTDATED_LOCKFILE` + `pnpm@^10.33.2` added | **`npm install pnpm` in build** mutates `package.json` during CI | Use **`bash scripts/render-build.sh`** only |
| Build runs old command after git push | **Dashboard build command ≠ repo** | **Settings → Build Command** → paste `bash scripts/render-build.sh` → Save → Manual Deploy |

`render.yaml` does **not** update an existing service’s build command automatically. You must paste it in the dashboard once.

## 3. Create the Render service

**Option A — Blueprint**

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → select repo (`render.yaml`).

**Option B — Manual**

| Setting | Value |
|---------|--------|
| Build | `bash scripts/render-build.sh` |
| Env | `SKIP_INSTALL_DEPS=true` (required — stops Render’s default npm install) |
| Start | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Health check | `/api/healthz` |
| Plan | Free |
| Region | Singapore (closest to `asia-south1` Redis) |

Add the env vars from sections 1–2.

## 4. Point the web app at Render

Firebase Hosting build (or local `.env.production`):

```bash
VITE_API_BASE_URL=https://ace-digital-api.onrender.com
VITE_REALTIME_WS_URL=wss://ace-digital-api.onrender.com/ws
```

Rebuild and deploy the frontend:

```bash
pnpm run build:web:render
firebase deploy --only hosting
```

Or: `pnpm run deploy:hosting:render`. Keep `VITE_FIREBASE_CHAT=true` for Firestore fallback.

**Important:** With `VITE_API_BASE_URL` set, the app calls Render directly for REST. You can leave the Firebase `/api/**` rewrite in place (unused) or remove it later to avoid confusion.

If you still use Firebase Functions for REST, only set `VITE_REALTIME_WS_URL` to Render.

## 5. Keep the free instance awake (cron job)

See **[RENDER_KEEPALIVE_CRON.md](RENDER_KEEPALIVE_CRON.md)** for the full cron-job.org / UptimeRobot setup.

- **URL:** `https://ace-digital-api.onrender.com/api/healthz`
- **Every:** 10–14 minutes

Do **not** use Render’s “Cron Job” service type — it does not wake a Web Service.

## 6. Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/healthz
# {"status":"ok"}

# WebSocket: connect with JWT auth frame after open (see docs/CHAT.md)
```

## Cost snapshot (small team)

| Item | Cost |
|------|------|
| Render Free web service | $0 (750 instance-hours/mo, spin-down) |
| Redis Cloud free tier | $0 (within plan limits) |
| Firebase Hosting + Firestore | ~$0–3/mo (existing) |
| **Total** | **~$0–3/mo** |

Upgrade Render to **Starter ($7/mo)** if you want no spin-down and a more production-grade SLA.

## What you do **not** need on Render

- Separate `realtime-server` Cloud Run service
- Render Key Value (when using one API+WS instance)
- `REDIS_URL` is optional for chat on a single instance (inline hub handles WS)
