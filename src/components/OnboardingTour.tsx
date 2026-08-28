import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface TourStep {
  /** CSS selector for the `data-tour="..."` attribute this step points at
   * — see Sidebar.tsx, Dashboard.tsx, and App.tsx's FAB. */
  target: string
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Get around',
    body: 'Use the sidebar to jump between your Dashboard, each storage place, and the full item list.',
  },
  {
    target: '[data-tour="stat-row"]',
    title: 'See what needs attention',
    body: "These tiles show what's fresh, expiring soon, or expired — click one to filter the list below (the chart above reacts too).",
  },
  {
    target: '[data-tour="fab"]',
    title: 'Add an item',
    body: 'Add a new item any time with this button.',
  },
  {
    target: '[data-tour="sidebar-profile"]',
    title: 'Your account',
    body: 'Open your profile to see your account details and turn on two-factor authentication.',
  },
  {
    target: '[data-tour="sidebar-brand"]',
    title: 'Learn more',
    body: 'Click the logo any time to read about what ExpiryMate does.',
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface OnboardingTourProps {
  onComplete: () => void
}

/**
 * First-time onboarding tour (Feedback Sprint 3, 23/8/26) — a small
 * custom-built overlay rather than a new dependency, using framer-motion
 * (already a dependency for the modal/donut animations) for the
 * highlight and tooltip motion. Walks the fixed STEPS sequence above,
 * each pointing at a `data-tour="..."` anchored element (Sidebar.tsx's
 * nav/profile/brand, Dashboard.tsx's stat row, App.tsx's FAB), dimming
 * the rest of the page with the standard "9999px box-shadow spread"
 * spotlight trick rather than an SVG mask. Purely explanatory — Next/Skip
 * are the only interactive controls; the highlighted element itself isn't
 * clickable through the overlay, since the tour is a guided walkthrough
 * of what things do, not a guided task the user has to perform.
 *
 * Shown once per account: App.tsx checks the account's own
 * user_metadata.has_seen_tutorial (see AuthenticatedApp/completeTour)
 * before rendering this, and this component's only job once it's done is
 * to call onComplete(), which persists that flag. See docs/decisions.md,
 * "Feedback Sprint 3" for why that's account-level rather than
 * localStorage — "first time a user opens the app" means per-account, not
 * per-browser.
 */
export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  // Only the steps whose anchor is actually on the page. Resolved in an
  // effect rather than a render-phase initialiser because the anchors
  // don't exist in the DOM until after the first commit.
  //
  // Why filter at all (fixed 27/8/26 - see the sweep report, finding 7):
  // the "See what needs attention" step points at the dashboard's stat
  // row, and Dashboard.tsx renders an empty state instead of that row
  // when the account has no items. A brand-new account has no items, and
  // a brand-new account is the only audience this tour ever has, so that
  // step was never actually shown - yet the counter still said "of 5",
  // and the tour silently auto-advanced past it. Counting only the steps
  // that can really be shown makes "Step 2 of 4" tell the truth.
  const [steps, setSteps] = useState<TourStep[] | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSteps(STEPS.filter(s => document.querySelector(s.target) !== null))
  }, [])

  const step = steps === null ? null : steps[stepIndex]

  // Defensive: if none of the anchors are present there is no tour to
  // show, so mark it seen rather than leaving the user behind a blank
  // overlay. In practice at least the four sidebar/FAB anchors always
  // exist, so this should not fire.
  useEffect(() => {
    if (steps !== null && steps.length === 0 && !completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }, [steps, onComplete])

  useEffect(() => {
    if (!step || steps === null) return
    function measure() {
      const el = document.querySelector(step!.target)
      if (!el) {
        // The anchor went away after we measured it (e.g. the user's data
        // changed underneath the tour) - skip past rather than stranding
        // the tour on a step with nothing to point at. Guarded so it
        // can't run off the end.
        setStepIndex(i => (i < steps!.length - 1 ? i + 1 : i))
        return
      }
      const domRect = el.getBoundingClientRect()
      setRect({ top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, steps])

  function next() {
    if (steps !== null && stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      onComplete()
    }
  }

  if (!rect || !step || steps === null) return null

  const pad = 8
  const highlight = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  const TOOLTIP_WIDTH = 280
  const spaceBelow = window.innerHeight - (highlight.top + highlight.height)
  const placeAbove = spaceBelow < 200 && highlight.top > 200
  const tooltipLeft = Math.min(Math.max(highlight.left, 16), window.innerWidth - TOOLTIP_WIDTH - 16)
  // The tooltip itself is clamped to stay on-screen, which can pull it away
  // from directly under/over a wide or edge-hugging target (e.g. the full-
  // width stat row) — the arrow is positioned independently so it still
  // points at the target's actual centre rather than always sitting in the
  // tooltip's top-left corner.
  const targetCenterX = highlight.left + highlight.width / 2
  const arrowLeft = Math.min(Math.max(targetCenterX - tooltipLeft, 20), TOOLTIP_WIDTH - 20)

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="ExpiryMate tutorial">
      <motion.div
        className="tour-highlight"
        animate={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          className={`tour-tooltip${placeAbove ? ' tour-tooltip-above' : ''}`}
          style={{
            ...(placeAbove
              ? { bottom: window.innerHeight - highlight.top + 12 }
              : { top: highlight.top + highlight.height + 12 }),
            left: tooltipLeft,
            width: TOOLTIP_WIDTH,
            '--tour-arrow-left': `${arrowLeft}px`,
          } as unknown as React.CSSProperties}
          initial={{ opacity: 0, y: placeAbove ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <span className="tour-step-count">Step {stepIndex + 1} of {steps.length}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <div className="tour-actions">
            <button type="button" className="secondary-button" onClick={onComplete}>
              Skip
            </button>
            <button type="button" onClick={next}>
              {stepIndex === steps.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
