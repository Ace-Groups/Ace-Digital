# Render Production API Deployment Guide

This document describes how to deploy the Express API server to Render, configure its database connectors, setup CORS origins, and configure WebSockets.

---

## 1. Web Service Configuration

When deploying the API server to Render, configure a **Web Service** with the following parameters:

- **Runtime**: `Node`
- **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`
- **Start Command**: `pnpm --filter @workspace/api-server start`
- **Region**: Matches your database/Redis location (e.g. `Singapore` or `Oregon`).

---

## 2. Environment Variables

Configure the following variables in the **Environment** tab of your Render dashboard:

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | Yes | `8080` | Server listening port. |
| `NODE_ENV` | Yes | `production` | Enables production mode optimizations. |
| `JWT_SECRET` | Yes | `generatesRandomBase64String` | Secret key used to sign Auth tokens (minimum 32 characters). |
| `CORS_ORIGINS` | Yes | `https://ace-digital-os.web.app,http://localhost:8081` | Comma-separated list of allowed origins. **Must include mobile Metro development origin (port 8081) and production web domain.** |
| `USE_FIRESTORE` | Yes | `true` | Set to `true` to use Firestore as the primary database, bypassing Postgres. |
| `FIREBASE_PROJECT_ID` | Yes | `ace-digital-os` | Your Firebase Project ID. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | `{"type": "service_account", ...}` | Complete Firebase service account JSON. Format it as a single-line string. |
| `REDIS_URL` | No | `redis://default:password@host:port` | Connection string for Redis. If not provided or unreachable, server defaults to direct database writes for chat persistence. |
| `RESEND_API_KEY` | No | `re_...` | API key for Resend email notifications. |

---

## 3. WebSocket Compatibility on Render

Render fully supports WebSockets and HTTP/2. To ensure optimal performance:

1. **Proxy Settings**: Sockets route through the standard HTTPS port (`443`). No extra ports need opening.
2. **Session Persistence**: Ensure clients connect with `transports: ['polling', 'websocket']` to let WebSockets negotiate connections correctly through Render's load balancers.
3. **Heartbeat Timeouts**: Render terminates connections idle for more than 5 minutes. The socket server handles this by maintaining ping/pong heartbeats automatically every 25 seconds.

---

## 4. Keep-Alive Cron (Optional)

Free tier instances on Render automatically spin down after 15 minutes of inactivity. To prevent delays on the first API request, configure a cron job or ping scheduler (e.g. using UptimeRobot or cron-job.org) to request `https://your-api-url.onrender.com/health` every 10 minutes.
