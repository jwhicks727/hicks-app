import { useRef } from 'react'

/** Touch handlers for a sideways swipe: left for next, right for previous. A tap still taps. */
export function useSwipe(onNext, onPrev) {
  const start = useRef(null)
  return {
    onTouchStart: (e) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY } },
    onTouchEnd: (e) => {
      if (!start.current) return
      const t = e.changedTouches[0], dx = t.clientX - start.current.x, dy = t.clientY - start.current.y
      start.current = null
      if (Math.abs(dx) > 60 && Math.abs(dy) < 40) (dx < 0 ? onNext : onPrev)()
    },
  }
}
