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

/** Back, walking the same history as the browser's Back; to `to` when opened directly. */
export function Crumb({ to, children }) {
  return (
    <a className="crumb" href={to} onClick={(e) => { e.preventDefault(); goBack(to) }}>
      ‹ {children}
    </a>
  )
}
