import { STAMP_COLOURS } from '../../lib/yonder.js'

// A passport stamp, drawn in code for its kind of place: a frame with a perforated
// edge, a small picture of the kind (peaks, waves, a cactus, a castle, a tent, a
// tree for a national park, a skyline, a little house), the place and the month.
// National parks are round and a little larger. Each sits on its own cream paper
// (the app's #FFF8EE), so its ink reads the same in light and dark. Nobody's artwork or logo.

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
const PICS = {
  mountain: <path {...P} d="M22 62l16-24 10 13 7-9 15 20z" />,
  coast: <g {...P}><path d="M20 54c6-5 10-5 16 0s10 5 16 0 10-5 16 0" /><path d="M20 63c6-5 10-5 16 0s10 5 16 0 10-5 16 0" /><circle cx="56" cy="38" r="6" /></g>,
  lake: <g {...P}><path d="M22 50l12-14 8 9 6-6 12 11z" /><ellipse cx="44" cy="60" rx="20" ry="5" /></g>,
  desert: <g {...P}><path d="M44 66V34M44 46h-8v-8M44 52h8v-10" /><path d="M20 66h48" /><circle cx="60" cy="32" r="5" /></g>,
  castle: <g {...P}><path d="M26 66V42h8v-6h4v6h12v-6h4v6h8v24z" /><path d="M40 66v-9a4 4 0 0 1 8 0v9" /><path d="M44 36V26l6 3-6 3" /></g>,
  camp: <g {...P}><path d="M22 64l22-30 22 30z" /><path d="M44 34v30M38 64l6-10 6 10" /></g>,
  park: <g {...P}><path d="M44 28l-12 16h7l-9 11h10l-8 10h24l-8-10h10l-9-11h7z" /><path d="M44 65v4" /></g>,
  city: <g {...P}><path d="M22 66V46h8v20M32 66V34h10v32M44 66V42h8v24M54 66V30h10v36" /><path d="M20 66h48" /></g>,
  town: <g {...P}><path d="M28 66V48l16-12 16 12v18z" /><path d="M40 66v-9h8v9" /></g>,
}

const month = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()

/** One stamp: `kind` from stampKind(), the place's name and the trip's first day. */
export default function Stamp({ kind, name, date, size = 120, tilt = 0 }) {
  const c = STAMP_COLOURS[kind] || STAMP_COLOURS.town
  const round = kind === 'park'
  const label = String(name || '').slice(0, 20).toUpperCase()
  return (
    <svg className="yo-stamp" viewBox="0 0 88 100" width={size} height={size * 100 / 88} role="img" aria-label={`${name}, ${month(date)}`} style={{ color: c, transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      {round ? (
        <>
          <circle cx="44" cy="50" r="43" fill="#FFF8EE" />
          <circle cx="44" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="2 3.2" />
          <circle cx="44" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <rect x="1" y="1" width="86" height="98" rx="5" fill="#FFF8EE" />
          <rect x="3" y="3" width="82" height="94" rx="4" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="2 3.2" />
          <rect x="9" y="9" width="70" height="82" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
      <g transform={round ? 'translate(9.5 1) scale(.78)' : 'translate(0 -6)'}>{PICS[kind] || PICS.town}</g>
      <text x="44" y={round ? 69 : 80} textAnchor="middle" fontSize={round ? (label.length > 12 ? 5.4 : 6.4) : (label.length > 14 ? 6.2 : 7.4)} fontWeight="800" fill="currentColor" letterSpacing=".6">{round ? label.slice(0, 16) : label}</text>
      <text x="44" y={round ? 77 : 89} textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" letterSpacing="1">{month(date)}</text>
    </svg>
  )
}
