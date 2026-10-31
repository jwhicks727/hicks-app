import { Link } from './Link.jsx'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  home: <g {...S}><path d="M3 19h18" /><path d="M6 19a6 6 0 0 1 12 0" /><path d="M12 6V4M5.6 9.6 4.2 8.2M18.4 9.6l1.4-1.4" /></g>,
  world: <g {...S}><circle cx="8" cy="8" r="3" /><path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1" /><path d="M8 20h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 8 20z" /></g>,
  calendar: <g {...S}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></g>,
  kitchen: <g {...S}><ellipse cx="8" cy="7" rx="3.2" ry="4.2" /><path d="M8 11.2V21" /><path d="M16 3v6a2 2 0 0 0 2 2M20 3v6a2 2 0 0 1-2 2v10M18 3v5" /></g>,
  lifelist: <g {...S}><path d="M3 15c3 0 5-2 6-5 1-3 3-5 6-5 2 0 3 1 3 3l3 1-3 1c0 4-3 7-8 7H6z" /><path d="M9 20l1-3M12 20l1-3" /></g>,
  music: <g {...S}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></g>,
}
const TABS = [['home', 'Home'], ['world', 'World'], ['calendar', 'Calendar'], ['kitchen', 'Kitchen'], ['lifelist', 'Life List'], ['music', 'Music']]

/** A floating rounded bar on a phone; a side rail on a computer. */
export default function TabBar({ current }) {
  return (
    <nav className="tabs" aria-label="Places">
      <span className="brand">Team Hicks</span>
      {TABS.map(([key, label]) => (
        <Link key={key} to={key === 'home' ? '/' : '/' + key} className={'tab t-' + key} aria-current={current === key ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[key]}</svg>
          {label}
        </Link>
      ))}
    </nav>
  )
}
