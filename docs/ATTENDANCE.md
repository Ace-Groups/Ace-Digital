# Daily attendance

Attendance is a small punch clock for a 12-person team. Check-in and check-out live on the home screen and on `/attendance`. The morning roster, monthly grid, CSV, corrections, and office settings are on `/attendance`.

Nothing in this feature keeps Cloud Run warm. There is no cron and no minimum instance. A day with no punch is not stored as absent. The API computes the status when someone reads the roster, the month, or the summary.

Times are the server clock, shown in Asia/Kolkata. The browser clock is not used. Location is optional: the page asks the browser, and a denial still checks the person in.

## Status

One official status per person per day, in this order:

1. Admin override, when one is saved.
2. `on_leave` when an approved leave covers the date and the person has not checked in. Leave wins over a Sunday or a holiday.
3. `off` on a weekly off or a holiday, when there is no check-in. Default weekly off is Sunday. A check-in on an off day becomes present, late, or half-day.
4. No check-in: `not_in` for a future date, and for today before the absent cutoff. `absent` today at or after the cutoff, and on a past working day.
5. Check-in: `half_day` when they have checked out and worked less than the minimum hours, even if they were also late. Otherwise `late` when check-in is after office start plus grace. Otherwise `present`. An open session (no check-out) is present or late, not a half-day.

Defaults: office start `10:00`, grace `15` minutes, half-day minimum `4` hours, absent cutoff `13:00`. `10:15` with a 15-minute grace is still present. `10:16` is late.

Month totals count each day once. `lateCount` is days whose status is `late`. A half-day that arrived late is only a half-day. `not_in` and `off` are not absences. The CSV repeats `presentDays`, `lateCount`, `halfDays`, `absences`, `onLeaveDays`, and `offDays` on every row so payroll can read them later.

## Who can do what

| Action | Roles |
| --- | --- |
| Check in, check out, own month, own CSV | Any signed-in user |
| Morning roster, another person's month and CSV | `super_admin`, `management`, `hr`, `finance` |
| Correct a day | `super_admin`, `management`, `hr`. Reason of at least 3 characters |
| Change office hours, weekly offs, holidays | `super_admin`, `management` |
| Read settings | Any signed-in user |
| Summary API | `super_admin` only |

Inactive users are left off the roster and the summary. A correction can still target any existing user.

## Leave dates

Leave requests do not have start and end columns. The leave form writes the first line of the description as `YYYY-MM-DD to YYYY-MM-DD`. Approved `LEAVE` requests are read with that pair. A calendar event of type `leave_block`, or one whose source is `approval_leave`, also counts for the owner and the attendees. Older leave text that does not contain an ISO date pair is ignored.

## API

All routes need `Authorization: Bearer`. The router is mounted at `/api`.

- `GET /api/v1/attendance/today`
- `POST /api/v1/attendance/check-in` with optional `planNote` (max 280), `latitude`, `longitude`, `accuracy`
- `POST /api/v1/attendance/check-out` with the same optional location fields
- `GET /api/v1/attendance/roster?date=YYYY-MM-DD&teamId=`
- `GET /api/v1/attendance/month?month=YYYY-MM&userId=`
- `GET /api/v1/attendance/month.csv?month=YYYY-MM&userId=`
- `GET /api/v1/attendance/:userId/:date/audit`
- `PATCH /api/v1/attendance/:userId/:date` with `{ "status", "reason" }`
- `GET` and `PUT /api/v1/attendance/settings`
- `GET /api/v1/attendance/summary` and `GET /api/attendance/summary`

The summary takes exactly one of `date=YYYY-MM-DD` or `month=YYYY-MM`, plus an optional `teamId`. A date response is `{ date, counts, people }`. A month response is `{ month, totals, employees }`.

One check-in and one check-out per civil day. A second punch returns 409.

## Firestore

Writes go through the Admin SDK. Client rules allow reads and deny writes.

- `attendance_settings/default` — office start, grace, half-day hours, absent cutoff, `weeklyOff` (0 = Sunday … 6 = Saturday), `holidays` (`YYYY-MM-DD`, max 100).
- `attendance_days/{userId}_{date}` — punches, optional location, plan note, override.
- `attendance_days/{userId}_{date}/audit/{id}` — `check_in`, `check_out`, or `override`, with actor, time, reason, and before/after status.

Roster reads `where date ==`. Month and summary reads use `where date >=` and `where date <=`. Those use automatic single-field indexes. `firebase/firestore.indexes.json` also has `attendance_days` on `userId` + `date` for a later per-person query. A 12-person month is a few hundred documents.

Signed-in users may read settings. A person may read their own day and its audit. `super_admin`, `management`, `hr`, and `finance` may read every day. Everyone else is denied, including client writes.

Local API processes without `USE_FIRESTORE=true` keep punches in memory. Production Cloud Run sets `USE_FIRESTORE=true`.

## Deploy later

This change does not deploy. The punch API ships with the next Cloud Run image. The home card and `/attendance` ship with the next Hosting build. Rules and the new index ship with:

```bash
npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes --project ace-digital-int-12345
```

The date queries work on the automatic single-field index, so the roster does not wait for the composite index to finish building.
