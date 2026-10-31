import { moonLitPath } from '../lib/sky.js'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const PATHS = {
  cross: <path {...S} d="M12 3.5v17M7 8.5h10" />,
  heart: <path {...S} d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z" />,
  flag: <path {...S} d="M6 20.5V4M6 4.5h11l-2.2 4 2.2 4H6" />,
  bridge: <path {...S} d="M3 17h18M5.5 17v-3.5M18.5 17v-3.5M12 17v-6M5.5 13.5a7.5 6 0 0 1 13 0" />,
  globe: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17" /></g>,
  flame: <path {...S} d="M12 3.5c3.4 3.6 5.5 6 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.1 1-3.6 2.2-4.8.4 1.9 1.4 3 2.8 3.2-.9-2.6-.6-5.2.5-7.7z" />,
  leaf: <path {...S} d="M5 19c0-8 5.3-13.5 14-14 .2 8.8-5.6 14-14 14zM5 19l7.5-7.5" />,
  sun: <g {...S}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></g>,
  bird: <g {...S}><path d="M3.5 15c3 0 5-2 6-5s3-5 6-5c2 0 3 1 3 3l2.5 1-2.5 1c0 4-3 7-8 7h-4z" /><path d="M9 20l1-3M12 20l1-3" /></g>,
  note: <g {...S}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></g>,
  meteor: <g {...S}><path d="M3.5 20.5l7-7M7 12.5l-3 3M11.5 17l-3 3" /><circle cx="15.5" cy="8.5" r="4" /></g>,
  clock: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></g>,
  school: <path {...S} d="M3 10l9-6 9 6M5 9v11h14V9M10 20v-5h4v5" />,
  star: <path {...S} d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4-4 5.6-.8z" />,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" />,
}

/** A small line picture for a kind of calendar item. */
export function Glyph({ name, className = '' }) {
  return <svg className={'glyph ' + className} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name] || PATHS.dot}</svg>
}

const PHASE_FRACTION = { new: 0, first: 0.25, full: 0.5, last: 0.75 }
/** The moon as it looks: `phase` is a key (new, first, full, last) or SunCalc's 0..1. */
export function MoonGlyph({ phase, size = 24, className = '' }) {
  const p = typeof phase === 'string' ? PHASE_FRACTION[phase] : phase
  const r = size / 2 - 1.5
  const fraction = 0.5 * (1 - Math.cos(2 * Math.PI * p))
  return (
    <svg className={'moon-glyph ' + className} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle r={r} fill="#2E2A5C" />
      {fraction > 0.01 && <path d={moonLitPath(fraction, r)} fill="#F6E7B8" transform={p > 0.5 ? 'scale(-1 1)' : undefined} />}
      <circle r={r} fill="none" stroke="rgba(46,42,92,.55)" strokeWidth={size > 20 ? 1.5 : 1} />
    </svg>
  )
}
