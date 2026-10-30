# Product scope

Ace Digital is a 12-person team. The morning job is check-in, today's work, leave, and a look at who is in. Anything that does not serve that day is tucked away. Pages and API routes stay. They are hidden from navigation and direct links until an owner turns **Show extra tools** on in Settings, or sets `VITE_SHOW_EXTENDED_OPS=true`.

## Hidden

| Screen | Why it is not in the daily app |
| --- | --- |
| Reports | A report builder with an AI narrative. It duplicates tasks and payroll, and nobody opens it before 10am. |
| Activity | A second log next to the inbox and the home. The useful events already arrive as approvals and reviews. |
| Notes | A parallel document editor. Work for this team lives on a task, with a link, not in a second notebook. |
| Teams | A team directory on top of the people list. Twelve people fit on one employees screen. |
| Interns | An onboarding pipeline, ID cards, and certificates. That is a program, not the staff's morning. |
| Credentials | Signatories, a certificate ledger, and kiosk devices. Public verification stays at `/v` and `/verify`. The admin console does not. |
| Service desk | A second queue beside tasks. One place to submit work is enough. |

Ask Ace stays available with ⌘J. It is not a nav item and it is not the first thing in search.

## Kept

Home, attendance and the roster, tasks, leave and approvals, chat, payroll and payslips, people, projects, calendar, clients, settings, and the inbox. Clients and projects stay because the work is client work. Calendar stays because the day has meetings.

## Added, without a new service

- **Search (⌘K).** Jump to check-in, submit work, apply for leave, the roster, and people. It uses the lists the app already loads when the palette opens.
- **Inbox.** Pending approvals sit above older notifications. The bell was already there. The page now says what needs a decision.
- **Today's plan and the end of the day.** Check-in already stores a plan note. After check-out the card repeats the plan, the in and out times in India time, and the hours the server recorded.
- **Leave, with this month's use.** The API has no annual allowance, so the form does not invent one. It shows leave days already marked this month and how many of your requests are still waiting.
- **Submit work with a link.** The task API has a title and a status, not a file store. A link or file URL is saved on the title. The row shows Submitted, In progress, and Done. Files stay in Drive or Figma. We do not upload them.
- **Owner Today card.** Who is in, who is late, who is on leave, how many approvals are waiting, and how many tasks are overdue. Same roster and task endpoints as before.
- **Empty states** name the next action. Money stays in rupees. Dates and times use Asia/Kolkata.

## How to bring a screen back

Settings, as the owner (super admin): **Show extra tools**. The switch is stored on this browser only (`ace-show-extended`). It does not change Firestore or start a service.
