# Keep Render free tier awake (cron job)

Service: **https://ace-digital-api.onrender.com**

Free Render web services sleep after **15 minutes** with no HTTP traffic. First request after sleep can take **~50 seconds**.

Ping the health endpoint every **10–14 minutes** from an external cron (not Render Cron Jobs — use a free external monitor).

---

## Option A — cron-job.org (recommended, free)

1. Sign up at [https://cron-job.org](https://cron-job.org)
2. **Cronjobs** → **Create cronjob**
3. Fill in:

| Field | Value |
|-------|--------|
| **Title** | `ace-digital-api keepalive` |
| **URL** | `https://ace-digital-api.onrender.com/api/healthz` |
| **Schedule** | Every **10 minutes** (or custom: `*/10 * * * *`) |
| **Request method** | GET |
| **Enabled** | Yes |

4. Save. Open the job → **History** — you should see `200` and body `{"status":"ok"}`.

---

## Option B — UptimeRobot (free)

1. [https://uptimerobot.com](https://uptimerobot.com) → Add monitor
2. **Monitor type:** HTTP(s)
3. **URL:** `https://ace-digital-api.onrender.com/api/healthz`
4. **Monitoring interval:** 5 minutes (free tier)

---

## Do not use Render “Cron Job” for this

Render Cron Jobs are a **separate paid service type** and do not keep a **Web Service** awake. Use external HTTP pings to the web service URL above.

---

## Verify it works

1. Wait 20+ minutes without opening the app.
2. Run:

```bash
curl -w "\nTime: %{time_total}s\n" https://ace-digital-api.onrender.com/api/healthz
```

- **&lt; 2s** → instance was already warm (cron working or recent traffic).
- **30–60s** → instance was cold; shorten cron interval or accept cold starts.

---

## After cron: wire the web app

Build hosting with the Render API:

```bash
pnpm run build:web:render
firebase deploy --only hosting
```

Or set env manually (see [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md) §4).
