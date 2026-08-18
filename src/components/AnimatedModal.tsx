import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ModalOrigin } from '../hooks/useAnimatedModal'

interface AnimatedModalProps {
  visible: boolean
  origin: ModalOrigin
  onClose: () => void
  children: ReactNode
}

/**
 * The centred, "grows from where you clicked" modal shell shared by every
 * modal in the app. Pulled out of ItemList.tsx once the add-item flow
 * needed the exact same animation/backdrop/escape/scroll-lock behaviour,
 * rather than duplicating it a second time.
 */
export function AnimatedModal({ visible, origin, onClose, children }: AnimatedModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const style = visible
    ? undefined
    : { transform: `translate(${origin.x - centerX}px, ${origin.y - centerY}px) scale(0.3)`, opacity: 0 }

  return createPortal(
    <div
      className={`item-modal-backdrop ${visible ? 'item-modal-visible' : ''}`}
      onClick={onClose}
    >
      <div className="item-modal" style={style} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
