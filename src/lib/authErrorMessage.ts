/**
 * Turns a raw Supabase Auth error message into something a person can act on.
 *
 * Added 25/8/26 after a tester's sign-up failed with the raw string "email
 * rate limit exceeded" shown verbatim under the form (see
 * docs/decisions.md, "Sign-up confirmation emails: custom SMTP"). The
 * important thing that message failed to convey is that Supabase rejects the
 * sign-up *before* creating the row in auth.users when the project's hourly
 * email quota is spent, so there was no account, no confirmation email, and
 * no uid in the database, and the only correct next step was to sign up again
 * rather than to sit waiting for an email or try to sign in.
 *
 * Matching is on lowercased substrings rather than exact strings: supabase-js
 * surfaces GoTrue's `error.message`, and those strings carry variable detail
 * (retry seconds, field names) and have been reworded between versions, so an
 * exact match would silently stop working on a dependency bump. Anything
 * unrecognised falls through to the original message rather than a generic
 * "something went wrong", so a genuinely new failure is still diagnosable
 * from the UI without opening devtools.
 */
export function authErrorMessage(raw: string): string {
  const message = raw.toLowerCase()

  // The project has sent its allowed number of auth emails for the hour.
  // Nothing was created, so "try again" is genuinely the fix.
  if (message.includes('email rate limit exceeded') || message.includes('over_email_send_rate_limit')) {
    return "We couldn't send your confirmation email because this app has already sent as many as it's allowed to this hour. Your account was not created, so please try signing up again later."
  }

  // GoTrue's per-address cooldown, e.g. "For security purposes, you can only
  // request this after 47 seconds." Keep the number, drop the jargon.
  if (message.includes('for security purposes') || message.includes('after 1 second')) {
    const seconds = raw.match(/(\d+)\s*seconds?/)
    return seconds
      ? `Please wait ${seconds[1]} seconds before trying again.`
      : 'Please wait a moment before trying again.'
  }

  if (message.includes('invalid login credentials')) {
    return "That email and password don't match an account. Check both, or create an account if you haven't signed up yet."
  }

  if (message.includes('email not confirmed')) {
    return 'This account still needs to be confirmed. Check your inbox, and your spam folder, for the confirmation link.'
  }

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'There is already an account with that email. Try signing in instead.'
  }

  if (message.includes('password should be at least')) {
    const characters = raw.match(/(\d+)\s*character/)
    return characters
      ? `Your password needs to be at least ${characters[1]} characters.`
      : 'Your password is too short.'
  }

  if (message.includes('unable to validate email address') || message.includes('invalid format')) {
    return "That email address doesn't look right. Check it for typos."
  }

  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return 'New sign-ups are turned off for this app at the moment.'
  }

  // Network/offline: supabase-js surfaces the browser's own fetch failure.
  if (message.includes('failed to fetch') || message.includes('network')) {
    return "We couldn't reach the server. Check your internet connection and try again."
  }

  return raw
}
