import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
}

interface DonutProps {
  segments: DonutSegment[]
  size?: number
  /** What the punched-out centre shows below the total — defaults to
   * "items" but callers can rename it for a differently-scoped donut. */
  holeUnit?: string
  /** Feedback Sprint 2 (22/8/26): clicking a segment (its ring arc or its
   * legend row — the two are already linked through hover) now does
   * whatever the caller's stat tiles do for that same key, e.g. Dashboard
   * wires this to the same `toggle()` its "Fresh"/"Expiring soon"/etc.
   * stat tiles call. Optional so a Donut used purely for display can skip
   * it. */
  onSegmentClick?: (key: string) => void
}

const STROKE = 16
const GAP = 3 // small blank gap between adjacent segments, in stroke-path units

/**
 * A real SVG ring (UI feedback pass four, 21/8/26) — replaces the earlier
 * CSS conic-gradient disc, which had no way to put a gap between segments
 * or round their ends (both called for by the dataviz skill's mark spec,
 * and part of what made the chart read as flat/plain rather than polished
 * against the admin-template reference). Each segment is one `<circle>`
 * with a `stroke-dasharray`/`stroke-dashoffset` pair placing it at its own
 * slice of the ring, `stroke-linecap="round"` for the rounded data-ends,
 * and a small length trim (`GAP`) so consecutive segments never touch —
 * the trimmed sliver simply reveals the card's own background underneath,
 * no separate "gap colour" needed.
 *
 * Interactive: hovering a segment (or its matching legend row — the two
 * are linked through one `hovered` key) thickens that segment and swaps
 * the punched centre from the running total to that segment's own label
 * and count, crossfading between the two. Segments also sweep in on mount
 * rather than appearing instantly. The legend is still the real accessible
 * data underneath all of this, not decoration — every segment keeps its
 * swatch, name, and exact count as plain text regardless of hover state.
 */
export function Donut({ segments, size = 140, holeUnit = 'items', onSegmentClick }: DonutProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)

  const r = 45
  const circumference = 2 * Math.PI * r
  const viewBox = 120
  const holeSize = Math.round(size * 0.6)

  let acc = 0
  const arcs = segments.map((seg, i) => {
    const startFrac = total === 0 ? 0 : acc / total
    acc += seg.value
    const ownFrac = total === 0 ? 0 : seg.value / total
    const rawLen = ownFrac * circumference
    const len = segments.length > 1 ? Math.max(rawLen - GAP, 0) : rawLen
    return {
      seg,
      i,
      dasharray: `${len} ${circumference - len}`,
      dashoffset: -(startFrac * circumference),
    }
  })

  const hoveredSeg = segments.find(s => s.key === hovered) ?? null

  return (
    <div className="donut-row">
      <div className="donut-shape" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`} aria-hidden="true">
          <g transform={`rotate(-90 ${viewBox / 2} ${viewBox / 2})`}>
            {total === 0 ? (
              <circle
                cx={viewBox / 2}
                cy={viewBox / 2}
                r={r}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={STROKE}
              />
            ) : (
              // Feedback Sprint 2 (22/8/26): a zero-value segment still
              // reported here (e.g. "Unsafe" with a count of 0) computes a
              // zero-length arc, but `strokeLinecap="round"` on a
              // zero-length dash still renders — the two round end-caps of
              // a degenerate segment combine into a small solid dot right
              // on the ring, at whatever angle that segment's slice starts.
              // That's the "part of the chart still showing" bug: a status
              // with genuinely no items was drawing a visible dot anyway.
              // Filtering to only positive-value segments before rendering
              // removes it; the legend row for a 0-count status is
              // untouched, since a 0/0 count is correct to keep showing
              // there as plain text.
              arcs.filter(({ seg }) => seg.value > 0).map(({ seg, i, dasharray, dashoffset }) => (
                <motion.circle
                  key={seg.key}
                  cx={viewBox / 2}
                  cy={viewBox / 2}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeLinecap="round"
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  initial={{ opacity: 0, strokeWidth: STROKE }}
                  animate={{ opacity: 1, strokeWidth: hovered === seg.key ? STROKE + 5 : STROKE }}
                  transition={{
                    opacity: { duration: 0.35, delay: i * 0.07 },
                    strokeWidth: { duration: 0.15 },
                  }}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(seg.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSegmentClick?.(seg.key)}
                />
              ))
            )}
          </g>
        </svg>
        <div className="donut-hole" style={{ width: holeSize, height: holeSize }}>
          <AnimatePresence mode="wait" initial={false}>
            {hoveredSeg ? (
              <motion.div
                key={hoveredSeg.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="donut-hole-inner"
              >
                <span className="donut-hole-value">{hoveredSeg.value}</span>
                <span className="donut-hole-label">{hoveredSeg.label}</span>
              </motion.div>
            ) : (
              <motion.div
                key="total"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="donut-hole-inner"
              >
                <span className="donut-hole-value">{total}</span>
                <span className="donut-hole-label">{holeUnit}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ul className="donut-legend">
        {segments.map(seg => (
          <li
            key={seg.key}
            className={`donut-legend-row${hovered === seg.key ? ' donut-legend-row-active' : ''}`}
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
            <span className="donut-swatch" style={{ backgroundColor: seg.color }} aria-hidden="true" />
            <span className="donut-legend-label">{seg.label}</span>
            <span className="donut-legend-count">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
