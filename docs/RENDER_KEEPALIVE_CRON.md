# Do not keep the API warm

Cloud Run service `ace-digital-api` uses minimum instances **0** and request-based billing. Idle time is not charged. A cold start after idle is a few seconds and is the accepted tradeoff.

Do **not** add a cron, UptimeRobot monitor, or other health-check ping. Each ping is a request. A ping every 10 minutes holds or wakes an instance often enough to spend the free CPU quota and can produce a bill for a 12-person app that would otherwise stay at $0.

Do **not** set minimum instances above 0. That switches idle time onto a paid rate.

Chat does not need Redis. Leave `REDIS_URL` unset unless you deliberately run a queue elsewhere.
