# Ace Digital OS

An internal company operating system for Ace Digital — an IT company. Manages projects, teams, employees, finance/payroll, clients, approvals, reports, and team communications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ace-digital-os run dev` — run the frontend (port 21973)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- Frontend: React 19 + Vite (port 21973, path `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Auth: JWT Bearer tokens, bcryptjs hashing
- Build: esbuild (CJS bundle)
- UI: shadcn/ui, Tailwind CSS v4, lucide-react

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/db/src/schema/` — 12 Drizzle ORM table files (users, teams, projects, tasks, clients, approvals, expenses, payroll, channels, messages, activity, notifications)
- `artifacts/api-server/src/routes/` — all route handlers
- `artifacts/ace-digital-os/src/pages/` — all 10+ page components
- `artifacts/ace-digital-os/src/contexts/AuthContext.tsx` — JWT auth context
- `lib/api-client-react/src/custom-fetch.ts` — custom fetch mutator (handles auth token injection via `setAuthTokenGetter`)

## Architecture decisions

- JWT stored in `localStorage` as `ace_token`, injected via `setAuthTokenGetter` in custom-fetch.ts — not cookies (simpler for internal tool)
- Orval generates React Query hooks from OpenAPI spec; generated files are in `lib/api-client-react/src/generated/`
- Channels page renders its own full-screen layout (no AppLayout wrapper) for the chat interface
- bcrypt native bindings don't work in this environment — use `bcryptjs` (pure JS) in scripts; server-side uses bcrypt via API server which is fine
- `@types/pg` is NOT in the catalog — use direct version `^8.20.0` in package.json

## Product

- **Dashboard**: KPI cards, upcoming project deadlines, team load overview, recent activity feed
- **Projects**: Kanban board (To Do / In Progress / Review / Done) with drag-to-move
- **Tasks**: Filterable list with assignee, priority, due date, toggle-done
- **Employees**: Card view with team, role, salary; search; add new employee
- **Finance**: Salaries table, expenses table, payroll runs — all with ₹ INR
- **Clients**: Cards with company info, status, contract value
- **Approvals**: Submit requests; admins can approve/reject inline
- **Reports**: Quick-generate by type; view report history
- **Channels**: Full-screen team chat with WebSocket realtime (Firestore fallback)
- **Activity**: Complete audit log with actor, action, entity type

## Default Credentials

- Admin: `admin@acedigital.com` / `Admin@123` (role: super_admin)
- Employees: `*@acedigital.com` / `Emp@123`

## Brand Colors

- Sidebar: `#052659` (ace-800)
- CTAs/Active: `#5483B3` (ace-600)
- Content BG: `#C1E8FF` (ace-100)
- Currency: Indian Rupees (₹)

## User preferences

- Indian Rupees (₹) for all currency
- 6 teams: Engineering, Design, Sales, Finance, Operations, HR
- Brand colors must be maintained

## Gotchas

- `bcrypt` (native) fails in scripts — use `bcryptjs` instead
- `@types/pg` not in catalog — use direct `^8.20.0`
- `pg` not in catalog — use direct `^8.20.0`
- Orval operations with BOTH path params AND query params cause `Params` type collision — remove query params from such operations in openapi.yaml
- Channels page bypasses AppLayout — renders its own sidebar + chat layout

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
