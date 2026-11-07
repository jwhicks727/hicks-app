// The lists' two companions, drawn in code: a hummingbird for the morning and
// a western screech-owl for the evening, both birds that live round home all
// year. Anna's is an Anna's hummingbird (the rose crown and throat), the bird
// that shares her name. What each has earned (a scarf at seven days in a row,
// then a flower, a crown, a ring of stars, a rainbow tail) is worn for good,
// from the longest streak they've ever had. Motion is CSS (lists.css),
// transforms and opacity only, and still under less motion.

const ANNAS_ROSE = '#D6336C'

function Scarf({ x, y, w = 12, flip = false }) {
  return (
    <g className="dl-perk dl-perk-scarf">
      <path d={`M${x - w / 2} ${y} q${w / 2} 3.4 ${w} 0 v3 q${-w / 2} 3.4 ${-w} 0z`} fill="#D7263D" />
      <path d={flip ? `M${x - w / 2 + 2} ${y + 2} l-3 8 l3.6 -.6 l1.6 -6.4z` : `M${x + w / 2 - 2} ${y + 2} l3 8 l-3.6 -.6 l-1.6 -6.4z`} fill="#B3001B" />
      <path d={`M${x - w / 2 + 1} ${y + 1.6} h${w - 2}`} stroke="#F7C5CC" strokeWidth=".8" strokeDasharray="1.4 1.6" />
    </g>
  )
}
function Flower({ x, y, r = 2.6 }) {
  return (
    <g className="dl-perk dl-perk-flower">
      {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * r} cy={y + Math.sin((a * Math.PI) / 180) * r} r={r * 0.75} fill="#F6A6C1" />)}
      <circle cx={x} cy={y} r={r * 0.6} fill="#F2C14E" />
    </g>
  )
}
function Crown({ x, y, w = 11 }) {
  return (
    <g className="dl-perk dl-perk-crown">
      <path d={`M${x - w / 2} ${y} l1.4 -6 l2.6 3.2 l1.5 -4.6 l1.5 4.6 l2.6 -3.2 l1.4 6z`} fill="#F2C14E" stroke="#B8860B" strokeWidth=".7" strokeLinejoin="round" />
      <circle cx={x} cy={y - 2} r=".9" fill="#D7263D" />
    </g>
  )
}
function StarRing({ cx, cy, r }) {
  return (
    <g className="dl-perk dl-perk-stars" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {[0, 72, 144, 216, 288].map((a) => {
        const x = cx + Math.cos((a * Math.PI) / 180) * r, y = cy + Math.sin((a * Math.PI) / 180) * r
        return <path key={a} d={`M${x} ${y - 2.4}l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z`} fill="#F2C14E" />
      })}
    </g>
  )
}

/**
 * The hummingbird, facing the list (left). `throat` is the gorget's colour
 * (the person's own; an Anna's hummingbird's is rose), `perks` the keys
 * earned, `still` for a bird at rest (wings folded).
 */
export function Hummingbird({ throat = '#C42D20', annas = false, perks = [], still = false, className = '', title }) {
  const has = (k) => perks.includes(k)
  const gorget = annas ? ANNAS_ROSE : throat
  return (
    <svg className={'dl-hum ' + className} viewBox="0 0 80 64" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id="dl-rainbow" x1="0" y1="0" x2="0" y2="1">
          {['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE'].map((c, i) => <stop key={c} offset={i / 5} stopColor={c} />)}
        </linearGradient>
      </defs>
      {has('stars') && <StarRing cx={40} cy={32} r={28} />}
      <path d="M54 33 L72 26 L74 34 L70 43 Z" fill={has('rainbow') ? 'url(#dl-rainbow)' : '#2F4A3A'} />
      <g className={still ? 'dl-wings still' : 'dl-wings'}>
        <path className="dl-wing b" d="M45 29 Q55 10 70 7 Q61 20 48 31 Z" fill="#CFE9D3" opacity=".55" />
        <path className="dl-wing a" d="M44 29 Q50 8 64 3 Q58 18 46 31 Z" fill="#A9D6B0" opacity=".85" />
      </g>
      <ellipse cx="44" cy="34" rx="16" ry="9" transform="rotate(-18 44 34)" fill="#5E9E62" />
      <ellipse cx="42" cy="38.5" rx="11" ry="5.2" transform="rotate(-18 42 38.5)" fill="#EDE6D3" />
      {still && <path d="M40 31 Q52 26 62 33 Q52 34 42 36 Z" fill="#4C8752" />}
      <circle cx="28" cy="26" r="8.5" fill="#5E9E62" />
      <path d="M20.5 28 Q25 38 33.5 31.5 Q28.5 31 23.5 26.5 Z" fill={gorget} />
      {annas && <path d="M20.6 25.6 Q25 15.6 35.4 22.4 Q28.8 20.6 22.2 27 Z" fill={ANNAS_ROSE} />}
      <path d="M20.8 25.6 L3 22.6" stroke="#2B2019" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="26.2" cy="24.4" r="2" fill="#1B1410" />
      <circle cx="26.9" cy="23.7" r=".65" fill="#FFF8EE" />
      {has('scarf') && <Scarf x={32} y={31} w={11} />}
      {has('flower') && <Flower x={31} y={17.5} />}
      {has('crown') && <Crown x={27.5} y={18.5} />}
    </svg>
  )
}

/** The screech-owl, front on, on a branch. `asleep` closes its eyes; `turned` is its head turned round (the back of it). */
export function Owl({ perks = [], asleep = false, className = '', title }) {
  const has = (k) => perks.includes(k)
  return (
    <svg className={'dl-owl ' + className + (asleep ? ' asleep' : '')} viewBox="0 0 64 72" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {has('stars') && <StarRing cx={32} cy={38} r={30} />}
      <path d="M4 66 Q32 60 62 66" stroke="#6B4A2E" strokeWidth="4" strokeLinecap="round" fill="none" />
      {has('rainbow') && <path d="M26 60 L24 68 M29 61 L28 69 M32 61 L32 69 M35 61 L36 69 M38 60 L40 68" stroke="url(#dl-rainbow-o)" strokeWidth="2.4" strokeLinecap="round" />}
      <defs>
        <linearGradient id="dl-rainbow-o" x1="0" y1="0" x2="1" y2="0">
          {['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE'].map((c, i) => <stop key={c} offset={i / 5} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d="M14 42 C14 26 50 26 50 42 C50 58 42 64 32 64 C22 64 14 58 14 42Z" fill="#8E8A84" />
      <path d="M14.5 44 C12 52 16 60 22 62 C18 56 17 50 18.5 43Z M49.5 44 C52 52 48 60 42 62 C46 56 47 50 45.5 43Z" fill="#6F6B65" />
      <path d="M25 44v3M30 47v3M35 44v3M39 48v3M27 52v3M33 54v3M37 51v2.6" stroke="#5C5852" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M27 64 l-1.6 3 M29 64 l0 3.2 M35 64 l0 3.2 M37 64 l1.6 3" stroke="#D9A23A" strokeWidth="1.6" strokeLinecap="round" />
      <g className="dl-owl-head">
        <path d="M17.5 21 L14 8.5 L25 17Z M46.5 21 L50 8.5 L39 17Z" fill="#7C7872" />
        <ellipse cx="32" cy="25" rx="17.5" ry="14.5" fill="#8E8A84" />
        <g className="dl-owl-back">
          <path d="M22 18q10 -6 20 0M20 25q12 -5 24 0M22 32q10 -4 20 0" stroke="#6F6B65" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
        <g className="dl-owl-face">
          <ellipse cx="32" cy="26" rx="14.5" ry="11.5" fill="#B9B2A7" stroke="#5C5852" strokeWidth="1.2" />
          <circle cx="25" cy="24.5" r="5.6" fill="#F2C14E" />
          <circle cx="39" cy="24.5" r="5.6" fill="#F2C14E" />
          <circle className="dl-pupil" cx="25" cy="24.5" r="2.7" fill="#1B1410" />
          <circle className="dl-pupil" cx="39" cy="24.5" r="2.7" fill="#1B1410" />
          <circle cx="26" cy="23.4" r=".9" fill="#FFF8EE" />
          <circle cx="40" cy="23.4" r=".9" fill="#FFF8EE" />
          <g className="dl-lids">
            <ellipse cx="25" cy="24.5" rx="6" ry="6" fill="#9C978F" />
            <ellipse cx="39" cy="24.5" rx="6" ry="6" fill="#9C978F" />
            <path d="M19.6 25.5 q5.4 2.6 10.8 0 M33.6 25.5 q5.4 2.6 10.8 0" stroke="#5C5852" strokeWidth="1" fill="none" />
          </g>
          <path d="M32 28 L29.8 31.6 L32 34.6 L34.2 31.6Z" fill="#6B5A40" />
        </g>
        {has('flower') && <Flower x={46} y={12} r={2.4} />}
        {has('crown') && <Crown x={32} y={12} w={12} />}
      </g>
      {has('scarf') && <Scarf x={32} y={37.5} w={22} flip />}
    </svg>
  )
}

/** A small feather (a tick's burst, and the one that falls when a streak ends). */
export function Feather({ colour = '#E9A23B', className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3c-6 1-11 6-12 13l-2 5 1 .5 2-4c7-1 11-6 11-14z" fill={colour} />
      <path d="M7.5 16.5 16 7" stroke="rgba(0,0,0,.25)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

/** A small trophy, for the family shelf. */
export function Trophy({ className = '', colour = '#F2C14E' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M14 8h20v8a10 10 0 0 1-20 0z" fill={colour} stroke="#B8860B" strokeWidth="1.4" />
      <path d="M14 11H8a6 6 0 0 0 7 8M34 11h6a6 6 0 0 1-7 8" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 26h6v6h-6z" fill="#D9A23A" />
      <path d="M15 32h18l2 7H13z" fill="#6B4A2E" />
      <path d="M18 12l1.5 6M24 11v7" stroke="#FFF4C7" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
    </svg>
  )
}
