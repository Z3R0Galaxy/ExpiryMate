# ExpiryMate

A household food-expiry tracker. Users sign up, log the food items in their kitchen (name, category, storage location, printed expiry date, quantity, and whether it's opened), and the app works out an adjusted expiry date from USDA cold-storage guidance, flagging anything expiring soon or already unsafe to eat.

**Live:** https://expiry-mate.vercel.app
**Course context:** built for Year 12 Software Engineering, Assessment Task 3 (Software Engineering Project).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Backend / DB | Supabase (Postgres, Auth, Row Level Security) |
| Hosting | Vercel (auto-deploys from `main`) |
| Styling | Plain CSS, no UI library |

## Getting started

```bash
npm install
npm run dev
```

You'll also need a `.env.local` file in the project root with your Supabase project URL and anon key (see below) — it isn't committed to the repo, since it's git-ignored, so it has to be created locally.

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check with `tsc` then build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview a production build locally |

Environment variables needed in `.env.local`:

```
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon/publishable key>
```

The anon key is safe to expose client-side — it carries no privileges beyond what Row Level Security grants. Never put a service-role key here.

## Project structure

```
your-project/
├── README.md                        this file
├── docs/                            the folio — planning, decisions, and evidence
│   ├── 01-problem-statement.md      need, opportunity, scope
│   ├── 02-requirements.md           functional and non-functional requirements
│   ├── 03-architecture.md           design, request lifecycle, diagrams
│   ├── 04-data-model.md             schema, ERD, relationships
│   ├── 05-security-review.md        threat model, RLS reasoning, defences
│   ├── 06-front-end-architecture.md component tree, CSS, accessibility
│   ├── 07-evaluation.md             the evaluation report
│   ├── 08-test-plan.md              test layers, coverage
│   ├── 09-iteration-log.md          UAT feedback, deployment iteration
│   ├── decisions.md                 decisions and trade-offs log (includes the build slice plan)
│   └── ai-use-log.md                substantive Claude Code interactions
├── src/
│   ├── components/                  Auth, AddItemForm, ItemList
│   └── lib/                         Supabase client setup
├── supabase/
│   ├── migrations/                  schema history, applied in order
│   └── functions/                   edge functions (reserved for expiry-notification email digest)
└── tests/
    ├── unit/                        pure logic (adjusted-expiry, status calculation)
    ├── integration/                 tests against a real Supabase schema (RLS, constraints)
    └── smoke/                       manual post-deploy checklist
```

## Where things stand

The build follows a six-slice plan (App Shell → Full Schema Forms → Adjusted Expiry Logic → Styling → Notifications → Nice-to-haves), documented in `docs/decisions.md`. Current progress and the reasoning behind each slice's scope live there rather than being duplicated here — check that file for the up-to-date status.

## Database schema

See `docs/04-data-model.md` for the full schema and ERD. In short: one `items` table, owned per-user via a foreign key to `auth.users`, protected by Row Level Security so a user can only ever see or modify their own rows.

## Security

See `docs/05-security-review.md` for the full threat model and a checklist against the assessment's security floor (auth, RLS, no service-role keys client-side, email verification, input validation, no plaintext sensitive data).
