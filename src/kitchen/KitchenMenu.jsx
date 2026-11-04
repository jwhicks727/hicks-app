import { useEffect, useRef } from 'react'
import { Link } from '../shell/Link.jsx'

// Each tab's little line drawing, on the tab icons' 24-unit grid
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICON = {
  week: <g {...S}><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M6 10h12M9 6.5v1.5M9 13v3" /></g>, // the fridge
  cookbook: <g {...S}><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" /><path d="M12 6.5V20" /></g>, // an open book
  plan: <g {...S}><rect x="3.5" y="5" width="13" height="14" rx="1.5" /><path d="M3.5 9.5h13M7 3v4M13 3v4" /><path d="M14.5 20.5l6-6-2-2-6 6-.5 2.5z" /></g>,
  rules: <g {...S}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></g>,
}

/**
 * The Kitchen's menu: index tabs, like the dividers in a recipe box. The tab you're on is the paper of the
 * cards and joins the strip under the row; the others sit a shade darker, a little lower. Adding and writing
 * recipes live inside the Cookbook; the weekly planner is the parents'.
 */
export default function KitchenMenu({ current, parent }) {
  const nav = useRef(null)
  const items = [
    ['', 'This week', '/kitchen', 'week'],
    ['cookbook', 'Cookbook', '/kitchen/cookbook', 'cookbook'],
    ...(parent ? [['plan', 'Weekly planner', '/kitchen/plan', 'plan']] : []),
    ['rules', 'Rules', '/kitchen/rules', 'rules'],
  ]
  // At the largest text size the row can scroll: the tab you're on starts in view
  useEffect(() => {
    const el = nav.current && nav.current.querySelector('[aria-current="page"]')
    if (el && nav.current.scrollWidth > nav.current.clientWidth) nav.current.scrollLeft = Math.max(0, el.offsetLeft - 8)
  }, [current])
  return (
    <nav ref={nav} className="ki-tabs" aria-label="The Kitchen">
      {items.map(([key, label, to, icon]) => (
        <Link key={key || 'week'} to={to} className="ki-tab" aria-current={current === key ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[icon]}</svg>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
