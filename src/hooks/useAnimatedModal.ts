import { useState } from 'react'

// Kept as one constant so the JS timeout that finally unmounts a modal
// can't drift out of sync with the CSS transition duration it's waiting on
// (see AnimatedModal.tsx, which uses the same value on the CSS side).
export const MODAL_TRANSITION_MS = 220

export interface ModalOrigin {
  x: number
  y: number
}

/**
 * Shared "grows from where you clicked" open/close state, used by every
 * modal in the app (the item detail/edit modal, the add-item modal) so the
 * animation logic lives in one place instead of being duplicated per modal.
 */
export function useAnimatedModal() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [origin, setOrigin] = useState<ModalOrigin>({ x: 0, y: 0 })

  function openFrom(sourceEl: HTMLElement) {
    const rect = sourceEl.getBoundingClientRect()
    setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    setOpen(true)
    // Mount at the source's position/scale first, then flip to visible a
    // frame later so the transition has something to animate from instead
    // of jumping straight to centred.
    requestAnimationFrame(() => setVisible(true))
  }

  function close() {
    setVisible(false)
    window.setTimeout(() => setOpen(false), MODAL_TRANSITION_MS)
  }

  return { open, visible, origin, openFrom, close }
}
