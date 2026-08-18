# Iteration Log

Chronological record of testing feedback, deployment events, and what changed as a result. Unlike `decisions.md` (which records *what was decided and why*) and `ai-use-log.md` (which records *AI interactions*), this file records *what happened when the app met real use or a real deploy* — UAT sessions, bug reports, and iteration off the back of them.

## Format

Each entry: date, what happened (test session / deploy / feedback received), what it revealed, what changed (or will change) as a result.

---

## 18/8/26

Repository audit against the assessment's mandated structure (this session). No app-usage iteration yet — this entry exists to mark the point the repo structure was brought into line with `docs/`, `supabase/functions/`, and `tests/{unit,integration,smoke}/` as required, and to note that an existing Vercel deployment is in place and needs to be kept in sync as Slices 1–5 land. Future entries here should be actual UAT/deploy feedback, not structural housekeeping — that belongs in `decisions.md`.

## 18/8/26 (Slice 1 — App Shell)

`App.tsx` rewritten to wire `Auth`, `AddItemForm`, and `ItemList` together with real Supabase session management (`getSession` on mount, `onAuthStateChange` subscription, Sign Out button). Migration `20260818000000_split_items_rls_policies.sql` written to replace the single broad RLS policy with four per-operation ones. Verified `tsc -b --force` compiles clean with no type errors. **Not yet verified:** the actual sign-in/sign-out/add-item flow in a real browser, and the RLS migration hasn't been run against the live Supabase project yet — both need doing before Slice 1 is genuinely "done" rather than just "compiles."
