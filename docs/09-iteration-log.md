# Iteration Log

Chronological record of testing feedback, deployment events, and what changed as a result. Unlike `decisions.md` (which records *what was decided and why*) and `ai-use-log.md` (which records *AI interactions*), this file records *what happened when the app met real use or a real deploy* — UAT sessions, bug reports, and iteration off the back of them.

## Format

Each entry: date, what happened (test session / deploy / feedback received), what it revealed, what changed (or will change) as a result.

---

## 18/8/26

Repository audit against the assessment's mandated structure (this session). No app-usage iteration yet — this entry exists to mark the point the repo structure was brought into line with `docs/`, `supabase/functions/`, and `tests/{unit,integration,smoke}/` as required, and to note that an existing Vercel deployment is in place and needs to be kept in sync as Slices 1–5 land. Future entries here should be actual UAT/deploy feedback, not structural housekeeping — that belongs in `decisions.md`.
