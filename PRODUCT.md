# Product

<!-- impeccable:product-schema 1 -->

Facts below are taken from the repository and the owner's brief. The owner was not in this session to confirm them one by one.

## Platform

web

## Users

A 12-person Ace Digital team. Staff check in from phones in the morning and use a laptop later in the day. The owner and admins (`super_admin`, `management`) need a morning picture of who is in, what is waiting for approval, and whether pay is on track. Employees need to check in, see today's tasks, submit work, and apply for leave. HR, finance, and team leads use the same app with a narrower set of screens.

## Product Purpose

Ace Digital OS is the company's working system: attendance, tasks, leave, payroll, chat, and administration in one signed-in web app. Success is a person finishing the morning action in one or two taps, and an owner seeing today's roster without hunting.

## Positioning

It is the internal operating app for this company, not a public product and not a marketing site. The mechanism is one login, one home, and the day's next action in front of the person who has that role.

## Operating Context

India office hours, Asia/Kolkata. Check-in is often on a phone. The same routes work on a desktop with a sidebar. Production is Firebase Hosting plus Cloud Run. This redesign does not change that deployment.

## Capabilities and Constraints

Roles: `super_admin`, `management`, `finance`, `hr`, `client_manager`, `team_lead`, `employee`. Attendance, tasks, approvals, finance, and chat already exist. Do not change API behavior except where a screen needs an existing endpoint. Do not deploy from this work. Keep the JavaScript bundle lean and routes lazy-loaded.

## Brand Commitments

The product name is Ace Digital. The mark is `artifacts/ace-digital-os/src/assets/ace-logo.png`. The owner asked for a calm, modern, premium professional look, one accent color, and no clutter. Light and dark both ship. Daily actions take at most two taps. Primary action is obvious on each screen.

## Evidence on Hand

Working screens and copy live in `artifacts/ace-digital-os`. Attendance behavior is documented in `docs/ATTENDANCE.md`. There are no customer testimonials to invent.

## Product Principles

- The next action is the page.
- One accent, status color only when it means something.
- Phones first, the same tasks on a desk.
- Motion confirms an action and stops when the person asks for less motion.
- Do not invent numbers the API did not return.

## Accessibility & Inclusion

WCAG 2.2 AA: contrast, visible focus, keyboard use, labels, and touch targets at least 44px. Honor `prefers-reduced-motion`.
