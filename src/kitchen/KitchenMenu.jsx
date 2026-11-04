import { useEffect, useRef } from 'react'
import { Link } from '../shell/Link.jsx'

/**
 * The Kitchen's menu, set like a magazine's: the places as big words across the top, the one you're on in
 * full and the others faded, scrolling sideways on a phone. `big` makes it the screen's title (the four
 * main screens, whose own heading is kept for screen readers only). Adding and writing recipes live inside
 * the Cookbook; planning is the parents'.
 */
export default function KitchenMenu({ current, parent, big = false }) {
  const nav = useRef(null)
  const items = [
    ['', 'This week', '/kitchen'],
    ['cookbook', 'Cookbook', '/kitchen/cookbook'],
    ...(parent ? [['plan', 'Weekly planner', '/kitchen/plan']] : []),
    ['rules', 'Rules', '/kitchen/rules'],
  ]
  // The word you're on starts in view, even when it's far along the row
  useEffect(() => {
    const el = nav.current && nav.current.querySelector('[aria-current="page"]')
    if (el && nav.current.scrollWidth > nav.current.clientWidth) nav.current.scrollLeft = Math.max(0, el.offsetLeft - 2)
  }, [current])
  return (
    <nav ref={nav} className={'ki-menu' + (big ? ' big' : '')} aria-label="The Kitchen">
      {items.map(([key, label, to]) => <Link key={key || 'week'} to={to} className="ki-item" aria-current={current === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
  )
}
