# Security Review

This document tracks ExpiryMate against the assessment's security floor and records the reasoning behind each defence. It's a living document: update it whenever a security-relevant decision is made, and cross-reference `decisions.md` for the "why" of anything non-obvious.

## Security floor checklist

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | Authentication via Supabase Auth | ✅ Met | Email/password via `supabase.auth.signUp` / `signInWithPassword` in `Auth.tsx`. No custom auth logic — Supabase owns credential storage, hashing, and session tokens. |
| 2 | At least one RLS policy protecting user data | ✅ Met, upgraded | `items` has RLS enabled. Migration `20260818000000_split_items_rls_policies.sql` replaces the original single `for all` policy with four per-operation policies (select/insert/update/delete), each still enforcing `auth.uid() = user_id`. Same protection, but now reads as a deliberate range of security features. Run against the live project and confirmed 18/8/26 — `items` now shows four separate policies in the dashboard rather than one. |
| 3 | No service-role keys in client-side code | ✅ Met | `src/lib/supabase.ts` only reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables. The anon key is designed to be public (it has no privileges beyond what RLS grants) and `.env.local` is git-ignored, so no secret material ships in the bundle or the repo. |
| 4 | Email verification enabled on signup | ✅ Met | Confirmed 18/8/26 in the Supabase dashboard (Authentication → Sign In / Providers): "Confirm email" is switched on. Matches the "Check your email to confirm your account" messaging already shown in `Auth.tsx` after sign-up. |
| 5 | Input validation on all form fields, client-side and database level | ✅ Met | DB level: `quantity` is checked between 1 and 999, `date_opened` cannot be in the future, `date_opened` is required whenever `is_opened` is true, and `category`/`storage_location` are constrained to enum values, so bad data cannot reach the table even if the UI is bypassed. Client level, added Feedback Sprint 2 (22/8/26): `src/lib/validateItem.ts` gives a readable message before any constraint violation is reached, covering a trimmed non-empty name, a required date, whole-number quantity bounds, and a `date_opened` that is required when opened and not in the future. The same module's `checkStorageSafety()` also blocks a save outright when the category, storage location and opened combination is unsafe, with a message naming where the item belongs. Both add and edit run the identical checks. Covered by `tests/unit/validateItem.test.ts`. |
| 6 | No plaintext storage of sensitive data | ✅ Met | The only "sensitive" data is authentication credentials, which Supabase Auth handles entirely (hashed, never touched by ExpiryMate's own code or database). `items` rows contain no passwords, tokens, or other secrets. |

## Threat model (brief)

**Unauthorized access to another user's items.** Mitigated by RLS — even if a client tried to query with an arbitrary `user_id`, Postgres enforces `auth.uid() = user_id` at the row level, not the application. This is the primary defence and it's enforced regardless of what the front end does.

**SQL injection.** Mitigated by using the `supabase-js` client throughout, which parameterises all queries. There is no raw SQL string concatenation anywhere in the app code.

**Cross-site scripting (XSS).** Mitigated by React's default JSX escaping — item names and other user-entered text are never rendered via `dangerouslySetInnerHTML`, so a malicious item name can't execute script in another session.

**Credential exposure.** The anon key is intentionally public and RLS is the actual access control, not key secrecy. No service-role key exists in this codebase at all — Supabase project management (e.g. running migrations) happens through the Supabase CLI/dashboard with the developer's own credentials, never embedded in the app.

**Session handling.** `supabase-js` manages the session token in the browser (localStorage) by default. This is a reasonable default for a household tracking app with no highly sensitive data, but it's worth naming explicitly here as an accepted trade-off rather than an oversight — a token-theft-via-XSS scenario would rely on an XSS vector that React's escaping already closes off.

**Brute-force login attempts.** Not separately mitigated beyond whatever Supabase Auth does by default (basic rate limiting exists on Supabase's side for auth endpoints). Not a focus for this project's scope, noted here for completeness rather than as a planned addition. Any account that has opted into two-factor authentication (see below) is additionally protected against a successful password guess alone being enough to sign in.

## Two-factor authentication (added Feedback Sprint 3, 23/8/26)

Beyond the assessment's own security floor (the six-item checklist above), the app now offers opt-in TOTP two-factor authentication, using Supabase Auth's built-in MFA support directly rather than a custom implementation — Supabase stores and verifies the factor itself, so no shared secret or verification logic lives in this app's own code or database.

**Mechanism.** `ProfilePage.tsx`'s `TwoFactorSettings` calls `supabase.auth.mfa.enroll({ factorType: 'totp' })`, which returns a QR code and a manual-entry secret; the factor is only marked `verified` once the user proves possession of it with one correct 6-digit code (`challenge` + `verify`). `App.tsx`'s top-level `App()` checks `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` after every sign-in and requires a fresh code (via `MfaChallenge.tsx`) before rendering the authenticated app to any session that hasn't reached `aal2` but has a verified factor on file — a password alone is no longer sufficient for such an account.

**Disabling requires the same proof enrolling does.** Turning two-factor off (`TwoFactorSettings`'s "Disable") also requires a correct fresh code before `unenroll` is called — a bare signed-in session (e.g. a stolen but not-yet-expired token, or a device left unlocked) can't turn the protection off by itself.

**Opt-in, not enforced.** Per the user's own choice when this sprint was planned (see `decisions.md`, "Feedback Sprint 3"), two-factor is opt-in from the account's Profile page rather than mandatory for every account — an account that never enrolls a factor behaves exactly as before this sprint, with `getAuthenticatorAssuranceLevel()` reporting `currentLevel === nextLevel` and no challenge ever shown.

**Not covered:** account recovery if a user loses access to their authenticator app and has no factor to unenroll with (no backup codes are generated on enroll) — acceptable for this project's scope, but a real product would need a recovery path (backup codes, or an admin-assisted reset) before this could be considered complete.

## Outstanding follow-ups

1. **Rotate the database password.** During troubleshooting on 18/8/26 the Supabase database password was pasted into a chat in plain text. Rotation was recommended more than once and has never been confirmed done. This is the highest-priority open item on this page: unlike everything else here it is a live exposure, not a hardening gap.
2. **Confirm the Redirect URLs allow-list.** `Auth.tsx` passes `emailRedirectTo: window.location.origin` on sign-up so the confirmation link always points at wherever the app is running. Supabase only honours that if the exact origin is present in Authentication, URL Configuration, Redirect URLs, and silently falls back to the Site URL otherwise. The deployed Vercel origin has not been confirmed present since 21/8/26.
3. **Account recovery paths.** Two gaps, both acceptable for this project's scope but both real. There is no password reset flow at all, so a user who forgets their password cannot recover the account from within the app. And two-factor enrolment generates no backup codes, so a user who loses their authenticator has no factor to unenroll with.
4. **Automate the RLS check.** Isolation was verified by hand against a clean Postgres instance on 27/8/26, including the mutation paths (see `tests/integration/README.md`). Running that on every change rather than on request would make it a control rather than a snapshot.

## Notes on items since closed

**Client-side validation** was the one partial item on the checklist above for most of this project. It was closed in Feedback Sprint 2 by `validateItem.ts`, and row 5 now reflects that.

**The notification permission flow** was reviewed on 27/8/26. `useExpiryNotifications` requests permission only when it has not yet been decided, returns silently if it is refused, and passes no item data anywhere: the notification body is built and displayed entirely in the browser, and since UI feedback pass eight it contains either one item name or a bare count. Nothing leaves the authenticated session.

**Two timezone bugs** were found and fixed on 27/8/26. Neither is a security issue, but both are recorded here because one of them lived in a database constraint: `date_opened <= current_date` was evaluated in the server's UTC timezone while the client validated against the browser's local date, so a legitimate value was rejected by Postgres for the first hours of every day in any timezone ahead of UTC. Migration `20260827000000_widen_date_opened_check.sql` widens it by one day, which covers every real offset while still refusing a genuinely nonsensical future date. The lesson worth keeping: a constraint that calls a non-immutable function like `current_date` is evaluated in the server's context, not the user's, and the two need to be reasoned about together.

With email verification confirmed on and client-side validation now in place, all six security floor items are met. The open items above are hardening and recovery gaps rather than unmet floor requirements, with the exception of item 1, which should be actioned regardless of scope.
