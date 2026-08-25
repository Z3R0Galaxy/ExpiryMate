# Sign-up confirmation emails: custom SMTP setup

**Written 25/8/26**, after a tester's sign-up on `https://expiry-mate.vercel.app` failed with
`email rate limit exceeded` and no matching row appeared in `auth.users`.

## What actually went wrong

The project has never had a custom SMTP server configured, so every confirmation email has been
going through **Supabase's built-in email service**. That service has two hard limits, and this
sign-up hit both:

1. **2 emails per hour, project-wide.** Once that hour's quota is spent, Supabase Auth rejects the
   sign-up with `email rate limit exceeded` *before* it writes the user row, which is why the
   tester has no uid in the database. Nothing was half-created; the sign-up simply did not happen.
2. **It only delivers to pre-authorised team-member addresses** on the Supabase organisation.
   This is the more important one: even under the 2/hour limit, a confirmation email addressed to
   an outside tester would never have arrived. Earlier end-to-end tests passed because they used
   the project owner's own address, which *is* a team member.

Supabase documents the built-in service as best-effort and explicitly not for production use.
Custom SMTP is the fix for both problems at once. See
<https://supabase.com/docs/guides/auth/auth-smtp>.

## Setup steps

Provider chosen: **Brevo**. Its free tier is 300 emails/day and, unlike Resend, it will send to
arbitrary recipients from a *verified individual sender address*, with no domain of your own
required. That matters here: this project has no domain to authenticate.

### 1. Brevo: create the account and verify a sender

1. Sign up at <https://www.brevo.com> (free plan).
2. Go to **Senders, Domains & Dedicated IPs → Senders → Add a sender**.
   - Sender name: `ExpiryMate`
   - Email: the address the confirmation emails should come from.
3. Brevo emails that address a confirmation code. Enter it to verify the sender.
4. New free accounts are sometimes held for activation before sending is allowed. If sending is
   blocked, Brevo asks a couple of questions about what the account is for; answer them and wait
   for the account to be approved.

### 2. Brevo: generate an SMTP key

1. Open the account menu → **SMTP & API** → **SMTP** tab.
2. Copy the **login** shown there and click **Generate a new SMTP key**.
3. Copy the key immediately, since it is only shown once.

Use the **SMTP key**, not an API key. They are different credentials and the API key will not
authenticate an SMTP connection.

### 3. Supabase: turn on custom SMTP

Dashboard → project **ExpiryMate** (`xsvzsghbmqrhwvjkbqka`) → **Authentication → Emails → SMTP
Settings** → enable custom SMTP, then fill in:

| Field | Value |
|---|---|
| Sender email | the sender address verified in step 1 |
| Sender name | `ExpiryMate` |
| Host | `smtp-relay.brevo.com` (confirm against the host shown on Brevo's SMTP page) |
| Port | `587` |
| Username | the Brevo SMTP login from step 2 |
| Password | the Brevo SMTP key from step 2 |

Save.

### 4. Supabase: raise the email rate limit

**Authentication → Rate Limits → "Rate limit for sending emails."** Enabling custom SMTP starts
this at 30/hour rather than 2/hour, which is already enough for a testing sprint; raise it further
if a session with many testers needs it. This field cannot be raised while the built-in email
service is still in use, which is why it has to happen after step 3.

### 5. While in the dashboard, close the outstanding redirect item

In **Authentication → URL Configuration**, confirm:

- **Site URL** is `https://expiry-mate.vercel.app` (it has drifted back to `localhost` twice
  before, see `docs/decisions.md`, "Auth redirect URL fix").
- **Redirect URLs** includes `https://expiry-mate.vercel.app/**`. Without it, the
  `emailRedirectTo` that `Auth.tsx` passes is silently ignored and the confirmation link falls
  back to the Site URL. This was already logged as outstanding on 23/8/26 and is worth doing in
  the same sitting, since a confirmation email that arrives and then lands the user on `localhost` is
  no better than one that never arrives.

### 6. Unblock the tester who already hit this

Their sign-up never created an account, so there is nothing to repair, but they should not be
asked to guess that. Either:

- ask them to sign up again once step 3 is saved, or
- create the account for them: **Authentication → Users → Add user → Create new user**, ticking
  **Auto Confirm User** so no email is needed, then send them the password to change.

### 7. Verify

Sign up with an address that is **not** a Supabase team member (a spare personal address is
fine) and confirm the email arrives, the link lands on the Vercel domain, and the new uid shows in
**Authentication → Users**.

Check the spam folder on the first send. Mail sent from a free-mail sender address (e.g. a Gmail
one) without domain authentication is not DMARC-aligned and can be filtered, even though it will
deliver. If it becomes a problem, Brevo's **Domains** section will authenticate a real domain via
DNS records, which is out of scope for this project but is the fix.

## Code-side change made at the same time

`src/lib/authErrorMessage.ts` (new) maps raw Supabase Auth error strings to plain English, and
`Auth.tsx` now renders that instead of `error.message`. The rate-limit case specifically states
that the account was **not** created, since the raw string left the tester unable to tell whether
to try again, wait for an email, or attempt to sign in. Unrecognised errors still fall through to
the original message, so a new failure is still diagnosable from the UI.
