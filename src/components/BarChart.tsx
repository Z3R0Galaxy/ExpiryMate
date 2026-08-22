import { useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { DonutSegment } from './Donut'

interface BarChartProps {
  segments: DonutSegment[]
  ariaLabel: string
  /** Feedback Sprint 2 (22/8/26): clicking a bar now does whatever the
   * caller wants for that segment's key — Dashboard wires this to
   * navigate to that storage location's PlaceDashboard, the same
   * destination the sidebar's Fridge/Freezer/Pantry links go to. Optional
   * so a BarChart used purely for display can skip it. */
  onSegmentClick?: (key: string) => void
}

/**
 * A plain HTML/CSS/SVG-free bar chart, consistent with Donut.tsx's own
 * "no charting library, just the platform" approach. Added 21/8/26
 * (Feedback Sprint) to replace the dashboard's second donut: per the
 * dataviz skill, comparing a magnitude across a handful of discrete
 * categories (here, item counts per storage location) is a bar chart's
 * job, not a pie/donut's — a donut is for a whole made of parts, a bar
 * is for comparing sizes side by side. Reuses the same DonutSegment
 * shape and the same already-validated storage-location colours (see
 * index.css) so no new palette was introduced.
 *
 * Redesigned UI feedback pass four, 21/8/26 to match the Donut's polish:
 * bars grow in on mount (staggered) rather than appearing instantly, and
 * hovering a bar highlights it — dimming its neighbours and scaling up
 * its value label — mirroring the ring/legend hover pairing in Donut.tsx.
 * Each bar is still directly labelled with its exact value above it and
 * its category below it, so — per the dataviz skill's rule for ≤4
 * series — no separate legend is needed alongside it; the native `title`
 * tooltip is kept as a plain-text fallback for the same information.
 */
export function BarChart({ segments, ariaLabel, onSegmentClick }: BarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const max = Math.max(1, ...segments.map(seg => seg.value))

  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      {segments.map((seg, i) => {
        const heightPct = (seg.value / max) * 100
        const isHovered = hovered === seg.key
        const dimmed = hovered !== null && !isHovered
        return (
          <div
            key={seg.key}
            className={`bar-chart-col${dimmed ? ' bar-chart-col-dimmed' : ''}`}
            title={`${seg.label}: ${seg.value}`}
            onMouseEnter={() => setHovered(seg.key)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSegmentClick?.(seg.key)}
            role={onSegmentClick ? 'button' : undefined}
            tabIndex={onSegmentClick ? 0 : undefined}
            onKeyDown={onSegmentClick ? (e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSegmentClick(seg.key)
              }
            }) : undefined}
          >
            <motion.span
              className="bar-chart-value"
              animate={{ scale: isHovered ? 1.15 : 1 }}
              transition={{ duration: 0.15 }}
            >
              {seg.value}
            </motion.span>
            <div className="bar-chart-track">
              {/* Hands the raw colour to CSS as a custom property rather
               * than setting `backgroundColor` directly (UI feedback pass
               * seven, 21/8/26) — `.bar-chart-fill` in App.css turns this
               * into a top-to-bottom `color-mix()` gradient plus a hover
               * brightness lift, instead of the previous flat fill. The
               * underlying hues themselves (`--color-place-*` in
               * index.css) are unchanged: they're already the dataviz
               * skill's validated 3-series reference palette (byte-
               * identical hex values), so "nicer" here means richer
               * rendering of those same colours, not different ones. */}
              <motion.div
                className="bar-chart-fill"
                style={{ '--bar-color': seg.color } as CSSProperties}
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="bar-chart-label">{seg.label}</span>
          </div>
        )
      })}
    </div>
  )
}
