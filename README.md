# SymWellness Admin Console

Internal web console for the SymWellness team: users, subscriptions, usage,
support, compliance and reference data. React 19 · Vite · Tailwind CSS v4.

All data comes from the SymWellness backend (`/api/admin/*`, plus the existing
`/api/support/admin/*` and `/api/bug-report/admin/*`). There is no mock data.

## Run locally

```bash
npm install
cp .env.example .env.local      # optional
npm run dev                     # http://localhost:3000 (next free port if busy)
```

In development the Vite server proxies `/api` to `VITE_DEV_API_TARGET`
(default `http://localhost:9000`), so no CORS setup is needed.

## Create an admin account

Admins are normal users with `role: "admin"`. Create one from the backend repo:

```bash
cd ../backend
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='a-long-passphrase-12+' \
  node scripts/create-admin.js "First" "Last"
```

Run it against the database you intend to manage. Sign-in is rejected for any
non-admin account.

## Roles

| Role | Can do |
| --- | --- |
| **Admin** | View everything in the console, suspend / reactivate users, answer support, manage catalogs. Controls, content and notifications are read-only. |
| **Super admin** | Everything above, plus **create, edit, reset the password of, and permanently delete users**, change app controls, send notifications, grant free access and edit content / doctors. |

Super admin is a flag on the account, re-checked against the database on every
request (the token alone is not trusted), so revoking it takes effect at once.
It cannot be granted from the console or the public API. Grant it from the
backend:

```bash
ADMIN_EMAIL=you@company.com SUPER_ADMIN=true node scripts/create-admin.js
```

Safeguards on user management: super admins and admin accounts cannot be edited
or deleted by someone else; you cannot delete yourself or change your own role;
deleting requires typing the user's email and shows exactly which records will be
removed; an active Stripe subscription must be cancelled as part of the deletion;
every action is written to the audit log.

## What you can control from the console

| Where | What |
| --- | --- |
| **App controls** | Maintenance mode (every app request gets a friendly 503 while on; sign-in, payments and the console stay reachable) and per-feature switches (Thesis, calorie scan, meal planner…) with an optional message. Takes effect within ~15 seconds. Fails open: if the database is unreachable the app is not locked out. |
| **Notifications** | Push broadcast to an audience (everyone, patients, doctors, subscribers, trial, free, inactive 30+ days) with device count, lock-screen preview, test-to-self and delivery history. Dead device tokens are cleaned up automatically. |
| **Users → Free access** | Grant premium without a payment (reason required, optional end date). Stored separately from Stripe data and shown in the app as the complimentary plan. |
| **Users → Send a notification** | One-off push to a single user. |
| **Content** | Daily insights (create / edit / pause), onboarding quote, curated mindfulness books. |
| **Care network** | Add and edit doctor directory profiles. |

Every change above is recorded in the audit log. The app can also read the
current state without signing in from `GET /api/public/app-config`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API origin for production builds, e.g. `https://api.symhealth-ai.com`. Leave empty to use the same origin (reverse proxy). |
| `VITE_DEV_API_TARGET` | Dev-server proxy target. |

When the console is hosted on a different origin than the API, add that origin
to `CORS_ORIGIN` on the backend.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | Type-check (`tsc --noEmit`, strict) |
| `npm test` | Unit tests (API client, formatters) |

## Design notes

- **Privacy:** the admin API returns account, billing and aggregate usage data
  only. Medication names, symptoms, chat text and scan results are never sent to
  the console.
- **Auth:** tokens are kept in `sessionStorage` (cleared when the tab closes),
  refreshed automatically, and cleared on a 401.
- **Audit:** suspensions, deletion-request changes, catalog edits and user
  lookups are written to an audit log (Compliance → Audit log).
- **Routing:** hash-based (`#/users/<id>`), so deep links and refresh work with
  any static host.

## Not connected yet

- **Notifications are push only.** There is no in-app inbox, and users without
  a registered device (notifications not allowed) cannot be reached.
- **Weight Journey:** the mobile app calls `/api/weight-journey/*`, but the
  backend has no such routes yet, so there is nothing to manage.
- **Erasure requests:** completing a request in Compliance only records it. To
  erase the data, delete the user from Users (super admin). Stripe keeps the
  customer record and invoices for accounting; Firebase Auth accounts for
  Google / Apple sign-in are not removed.
