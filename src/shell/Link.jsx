import { forwardRef } from 'react'
import { navigate, goBack } from '../lib/router.js'

/** An in-app link: a real <a> with a real address, moved to without a page load. */
export const Link = forwardRef(function Link({ to, children, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={to}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
})

/**
 * Back, walking the same history as the browser's Back; to `to` when opened directly.
 * It always reads "Back": where it lands depends on where the person came from, so
 * the parent's name (`children`) is only the fallback, kept for the screen reader.
 */
export function Crumb({ to, children }) {
  const parent = typeof children === 'string' ? children : ''
  return (
    <a className="crumb" href={to} aria-label={parent ? `Back (or ${parent} if opened directly)` : undefined} onClick={(e) => { e.preventDefault(); goBack(to) }}>
      ‹ Back
    </a>
  )
}
