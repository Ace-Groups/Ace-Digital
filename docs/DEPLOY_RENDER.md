# Deploy REST API on Render

**Live service:** https://ace-digital-api.onrender.com

Render hosts the Express REST API. Firebase Hosting serves the SPA, and Firestore supplies realtime chat updates.

## Required environment

| Key | Value |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire service account JSON as one line |
| `USE_FIRESTORE` | `true` |
| `GCLOUD_PROJECT` | `ace-digital-os` |
| `JWT_SECRET` | Same secret as production auth |
| `SKIP_INSTALL_DEPS` | `true` |

## Render service

| Setting | Value |
|---------|-------|
| Build | `bash scripts/render-build.sh` |
| Start | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Health check | `/api/healthz` |
| Region | Singapore |

Use the root `render.yaml` Blueprint or configure the service manually.

## Frontend deployment

```bash
pnpm run build:web:render
firebase deploy --only hosting
```

`build:web:render` sets `VITE_API_BASE_URL=https://ace-digital-api.onrender.com`.

## Verify

```bash
curl https://ace-digital-api.onrender.com/api/healthz
# {"status":"ok"}
```

Then send a channel message and confirm another authenticated browser receives the Firestore update without refreshing.
