import { GlowWrap } from '../ui/Glow.jsx'

// Triple fives: a unicorn. A rainbow horn, drawn here, and the light round its card.
export const UNICORN_COLOURS = ['#FF8FD8', '#B69CFF', '#7FD3FF', '#8CF0C2', '#FFE27A', '#FFB08C']
export const unicornOccasion = (slug, title) => ({ key: `unicorn-${slug}`, name: `${title}: a unicorn`, colours: UNICORN_COLOURS, mode: 'swirl', extra: 'sparkle', sub: null, href: null, on: 'event' })

export function UnicornHorn({ size = 28 }) {
  return (
    <svg className="unicorn-horn" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs><linearGradient id="uh" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FF8FD8" /><stop offset=".35" stopColor="#B69CFF" /><stop offset=".65" stopColor="#7FD3FF" /><stop offset="1" stopColor="#FFE27A" /></linearGradient></defs>
      <path d="M5 21 L19.5 3.5 L10.5 22 Z" fill="url(#uh)" stroke="#6B4A8E" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.5 19.5 L11.6 20.6 M9.6 16.3 L13.2 17.4 M11.8 13 L14.8 14 M13.9 9.7 L16.3 10.6 M16 6.6 L17.7 7.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

/** A badge for a keeper or a unicorn. */
export function StandingBadge({ standing }) {
  if (standing.unicorn) return <span className="badge unicorn"><UnicornHorn size={18} />Unicorn: three 5s</span>
  if (standing.keeper) return <span className="badge keeper">★ Keeper</span>
  return null
}

/** Wraps a card in the unicorn's light when the recipe is one. */
export function UnicornGlow({ standing, slug, title, today, className, children }) {
  return <GlowWrap occasion={standing.unicorn ? unicornOccasion(slug, title) : null} day={today} className={className} replayAt="top">{children}</GlowWrap>
}
