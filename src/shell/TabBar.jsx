import { Link } from './Link.jsx'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  // Home is a sprout: things growing at home. (Lucide's "sprout", ISC licence.)
  home: <g {...S}><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" /></g>,
  world: <g {...S}><circle cx="8" cy="8" r="3" /><path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1" /><path d="M8 20h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 8 20z" /></g>,
  // The calendar carries a small cross: the Church year lives in it.
  calendar: <g {...S}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M12 12.3v6.2M9.7 14.4h4.6" /></g>,
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
      <span className="rail-more">
        <Link to="/settings" aria-current={current === 'settings' ? 'page' : undefined}>Settings</Link>
        <Link to="/setup" aria-current={current === 'setup' ? 'page' : undefined}>Setup</Link>
        <Link to="/reports" aria-current={current === 'reports' ? 'page' : undefined}>Reports</Link>
      </span>
    </nav>
  )
}
