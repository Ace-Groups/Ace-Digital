# Phase 2b — face check-in, visits, and accountability

This builds on the attendance punch in [ATTENDANCE.md](./ATTENDANCE.md). It does not deploy.

The mobile app is the Expo project on this repo's `mobile` branch (`artifacts/ace-digital-mobile`). `github.com/Ace-Groups/Ace-Digital-Mobile` is not a repository we can read, so that tree is the current app.

## What shipped

- Enrollment selfie with an explicit consent checkbox. Later check-ins send a live selfie. The phone measures the face and the API recomputes the cosine score. A weak or missing match is a manager review, not a rejection.
- Field visits: an owner, manager, or HR assigns a client, a map pin, a date, a time window, and a radius (default 200 m). The employee must be on site. Android can report a mocked location and that visit is flagged. iOS usually does not expose that flag, so a null mock value is allowed. GPS accuracy is stored. Outside the radius or the window is flagged with the distance.
- Daily plan on the mobile check-in, an end-of-day work log with proof links, and a weekly scorecard (attendance, punctuality, tasks on time, review outcomes) on the owner home. Employees see their own row.
- Presence checks are off until an owner turns them on. They are created only when the person opens the app during the slot. There is no cron and no background capture. Idle means checked in, no work log, and quiet for the configured hours during office time.

## Limits

The match is a 12-number geometric embedding, not a paid face API. A copied enrollment vector can still score as a match; the stored selfie and the human review are the check. Blink and head-turn liveness run only when ML Kit is in a native build. Expo Go has no detector: the selfie is stored and sent to review. Android emulators often report a mocked GPS fix, so a visit there is flagged.

## Privacy

Consent is required before a face payload is accepted. The photo stays in private Storage for 30 days. Employees can withdraw, which deletes the measurement and the enrollment photo. Managers see a selfie only through an authenticated API, not a public URL. There is no keystroke log, no hidden screenshot, and no background camera.

## Deploy later

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes,storage --project ace-digital-int-12345
```

Ship the API with the next Cloud Run image in asia-south1 and the web with the next Hosting build. Do not set a minimum instance.
