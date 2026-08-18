# Security Review

This document tracks ExpiryMate against the assessment's security floor and records the reasoning behind each defence. It's a living document: update it whenever a security-relevant decision is made, and cross-reference `decisions.md` for the "why" of anything non-obvious.

## Security floor checklist

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Authentication via Supabase Auth | ✅ Met | Email/password via `supabase.auth.signUp` / `signInWithPassword` in `Auth.tsx`. No custom auth logic — Supabase owns credential storage, hashing, and session tokens. |
| 2 | At least one RLS policy protecting user data | ✅ Met, upgraded | `items` has RLS enabled. Migration `20260818000000_split_items_rls_policies.sql` replaces the original single `for all` policy with four per-operation policies (select/insert/update/delete), each still enforcing `auth.uid() = user_id`. Same protection, but now reads as a deliberate range of security features. **Note:** the migration file exists in the repo as of Slice 1 — it still needs to be run in the Supabase SQL Editor against the live project before it's actually in effect, same as every other migration in this repo. |
| 3 | No service-role keys in client-side code | ✅ Met | `src/lib/supabase.ts` only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables. The anon key is designed to be public (it has no privileges beyond what RLS grants) and `.env.local` is git-ignored, so no secret material ships in the bundle or the repo. |
| 4 | Email verification enabled on signup | ✅ Met | Confirmed 18/8/26 in the Supabase dashboard (Authentication → Sign In / Providers): "Confirm email" is switched on. Matches the "Check your email to confirm your account" messaging already shown in `Auth.tsx` after sign-up. |
| 5 | Input validation on all form fields, client-side and database level | ⚠️ Partial | DB level is solid: `quantity` is checked between 1–999, `date_opened` can't be in the future, `date_opened` is required whenever `is_opened` is true, and `category`/`storage_location` are constrained to enum values — bad data can't reach the table even if the UI is bypassed. Client-side is currently just HTML5 `required` attributes on `name` and `expiry_date` in `AddItemForm`; there's no real validation of, e.g., an empty/whitespace-only name, an expiry date far in the past being silently accepted, or friendly error messages before the DB constraint rejects a bad quantity. **This needs work in Slice 2** — see the follow-up list below. |
| 6 | No plaintext storage of sensitive data | ✅ Met | The only "sensitive" data is authentication credentials, which Supabase Auth handles entirely (hashed, never touched by ExpiryMate's own code or database). `items` rows contain no passwords, tokens, or other secrets. |

## Threat model (brief)

**Unauthorized access to another user's items.** Mitigated by RLS — even if a client tried to query with an arbitrary `user_id`, Postgres enforces `auth.uid() = user_id` at the row level, not the application. This is the primary defence and it's enforced regardless of what the front end does.

**SQL injection.** Mitigated by using the `supabase-js` client throughout, which parameterises all queries. There is no raw SQL string concatenation anywhere in the app code.

**Cross-site scripting (XSS).** Mitigated by React's default JSX escaping — item names and other user-entered text are never rendered via `dangerouslySetInnerHTML`, so a malicious item name can't execute script in another session.

**Credential exposure.** The anon key is intentionally public and RLS is the actual access control, not key secrecy. No service-role key exists in this codebase at all — Supabase project management (e.g. running migrations) happens through the Supabase CLI/dashboard with the developer's own credentials, never embedded in the app.

**Session handling.** `supabase-js` manages the session token in the browser (localStorage) by default. This is a reasonable default for a household tracking app with no highly sensitive data, but it's worth naming explicitly here as an accepted trade-off rather than an oversight — a token-theft-via-XSS scenario would rely on an XSS vector that React's escaping already closes off.

**Brute-force login attempts.** Not separately mitigated beyond whatever Supabase Auth does by default (basic rate limiting exists on Supabase's side for auth endpoints). Not a focus for this project's scope, noted here for completeness rather than as a planned addition.

## Outstanding follow-ups

1. Strengthen client-side validation in `AddItemForm` (and the inline edit form in `ItemList`) — non-empty/trimmed name, sensible date bounds, and quantity bounds mirrored client-side so users get immediate feedback instead of a raw Postgres error message. This is the one remaining open item on the security floor and should be picked up as part of Slice 2.
2. Once notifications (Slice 5) are built, confirm the browser `Notification` permission flow doesn't leak item data to anything outside the authenticated session.

With email verification confirmed on, all six security floor items are met except client-side input validation, which is tracked as a Slice 2 deliverable rather than outstanding risk — the database-level constraints already provide the actual backstop.
