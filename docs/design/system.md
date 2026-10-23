# Design system

Ace Digital OS is an operations tool used in daylight on a phone and later at a desk. The look is quiet: paper, ink, and one navy accent. Light is the default. Dark is the same hue, lifted so text still passes WCAG 2.2 AA.

UI/UX Pro Max recommended a Swiss operations system and warned against a second decorative accent. The gold and fashion pairing it also suggested does not fit this product, so it was not used. Impeccable's operate mode is the visitor mode: scan, act, leave.

## Color

One accent. Status colors are separate and only mean present, late, absent, money in, or money out.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| background | `hsl(220 18% 97%)` | `hsl(222 28% 8%)` | Page |
| foreground | `hsl(222 39% 11%)` | `hsl(210 25% 96%)` | Text |
| card | white | `hsl(222 22% 11%)` | Groups |
| primary | `hsl(215 84% 18%)` Ace navy | `hsl(210 62% 72%)` | The only accent: buttons, links, current nav |
| primary-foreground | white | `hsl(222 40% 10%)` | Text on the accent |
| muted-foreground | `hsl(215 14% 32%)` | `hsl(215 14% 74%)` | Secondary text, at least 4.5:1 |
| border | `hsl(220 13% 86%)` | `hsl(222 16% 18%)` | Hairlines |
| destructive | `hsl(0 72% 38%)` | existing rose | Destructive actions |
| ring | same as primary | same as primary | Focus |

Do not add a second brand color, a gradient fill, or a glow.

## Type

System sans: `ui-sans-serif, "Segoe UI", system-ui, sans-serif`. No webfont on the critical path.

| Step | Size | Use |
| --- | --- | --- |
| Page title | 1.5rem / 600 | One per screen, the `h1` |
| Section | 1rem / 600 | Roster, tasks |
| Body | 1rem / 400 | Controls and rows |
| Meta | 0.875rem / 400 | Time, status, helper |

Line length for reading copy stays under 65–75 characters. Headings use `text-balance` where a wrap would orphan a word.

## Space, radius, elevation

| Token | Value |
| --- | --- |
| Control height | 2.75rem (44px) minimum, 3rem for the primary action |
| Page padding | 1rem, 1.5rem from 768px |
| Stack gap | 2rem between sections, 0 inside a list |
| Radius | 0.5rem on controls, 0.75rem on groups |
| Elevation | A 1px border. Shadows stay on overlays only |

## Motion

Transitions are color and opacity, about 150ms, ease-out. The check-in confirmation is the status line and a toast, not a bounce. `prefers-reduced-motion: reduce` collapses animation and transition duration to none.

## Components

Built on the existing Radix set in `artifacts/ace-digital-os/src/components/ui`.

| Piece | Rule |
| --- | --- |
| Button | Primary is navy (or the lifted navy in dark). One primary per screen. `min-h-11`. Visible 2px focus ring. |
| Input and select | `min-h-11` at every width. Label above the field. Error text from the form message. |
| List | One bordered group. Rows are at least 44px. No icon-card grids for navigation. |
| Badge | Status only. Do not use a badge as decoration. |
| Modal | Interruptions only: create task, leave request, destructive confirm. |
| Toast | Success or failure of an action the person just took. |
| Empty | A sentence that says what is missing and the action that fills it. |
| Loading | A skeleton the size of the block it replaces. The full-screen cube is only the auth bootstrap, not a page. |
| Error | Name the failure and the retry. Login already does this. |
| Nav | Phone: bottom bar, four role destinations plus More. Desktop: sidebar, 44px rows, current page marked with `aria-current`. |

## Flows

Maximum two taps for the day.

| Role | First screen | Primary action | Second tap |
| --- | --- | --- | --- |
| Employee | Home | Check in | Submit work (`/tasks?new=1`) or apply for leave (`/approvals?new=leave`) |
| Owner, management, HR | Home | Check in, then read the roster | Approvals or the full roster |
| Finance | Home | Monthly pay status | Open finance |

Bottom bar:

- Employee: Home, Tasks, Leave, Chat
- Owner, management, HR: Home, Roster, Approvals, Chat
- Finance: Home, Finance, Approvals, Chat

## Accessibility

- Contrast of text and of the primary button meets 4.5:1.
- Focus is a 2px ring, not removed.
- Icon-only controls have accessible names.
- Targets are at least 44px.
- `prefers-reduced-motion` is honored globally.
- axe-core 4.10.3 (`wcag2a`, `wcag2aa`, `wcag22aa`) reports no violations on login, both role homes, tasks, and leave in the light theme. Zoom is allowed (`maximum-scale` removed).

## Performance

Routes stay lazy. The home no longer imports the chart canvas. Login no longer loads the particle scene. Inter and Clash Display are not requested.
