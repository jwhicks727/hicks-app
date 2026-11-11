import { mix, skyPoint, ridge, seeded } from './atmosphere.js'
import { moonLitPath } from '../lib/sky.js'

// The sky's own pieces, drawn in code for the campus and the rooms' windows: the sun and the moon where they
// really stand, far hills in the colour of the hour, clouds as thick as the forecast says and drifting the way
// the wind blows, and the weather itself (rain, snow, fog, a storm). Nothing here is a picture file, and
// nothing moves except by transform and opacity (src/academy/academy.css), so it's still under less motion.

// The far hills take the hour's colour, and fade into the haze at their feet
const HILL_INK = { night: '#0D0B1C', dawn: '#34365E', morning: '#5A6C88', day: '#4F6F82', golden: '#7A5A4C', sunset: '#3F2C4E', dusk: '#241A3A' }
// Clouds: [their tops, their undersides], by the hour; and when they're carrying rain
const CLOUD_INK = {
  night: ['#3B3760', '#242042'], dawn: ['#D4B2C0', '#7C6C98'], morning: ['#FFFFFF', '#E7DCE2'], day: ['#FFFFFF', '#D6E2EE'],
  golden: ['#FFEACB', '#E9B48A'], sunset: ['#F6B08C', '#A85F74'], dusk: ['#8D6A8E', '#4A3560'],
}
const RAIN_INK = { light: ['#C2C9D2', '#838C99'], dark: ['#3A3A54', '#1F1F36'] }
const CLOUD_SHAPES = [
  'M-26 0a8 8 0 0 1 4-15a12 12 0 0 1 22-6a9.5 9.5 0 0 1 17 6a7.5 7.5 0 0 1 5 15Z',
  'M-17 0a6.5 6.5 0 0 1 3-12a9 9 0 0 1 17-3a7 7 0 0 1 12 4a5.5 5.5 0 0 1 2 11Z',
  'M-34 0a6 6 0 0 1 4-11a9 9 0 0 1 16-5a11 11 0 0 1 20-3a8 8 0 0 1 15 4a6 6 0 0 1 9 9a4 4 0 0 1-2 6Z',
]

/** A far hill's colour at this hour: the sky's own with `k` of ink in it. */
export const hillInk = (a, k) => mix(a.sky.g[Math.max(0, a.sky.g.length - 2)], HILL_INK[a.phase], k)
/** The sun's colour: redder the lower it stands. */
export const sunInk = (a) => mix('#FF7A3D', '#FFF7DA', Math.max(0, Math.min(1, a.sun.alt / 14)))

/** How many clouds a sky this covered has. */
export const cloudCount = (cover) => (cover < 0.1 ? 0 : cover < 0.25 ? 1 : Math.round(2 + cover * 5))

/** The gradients the sky's pieces fill with: once, in the drawing's <defs>. */
export function SkyDefs({ id, a }) {
  const wet = a.weather.wet || a.weather.kind === 'snow' || (a.weather.kind === 'cloudy' && a.weather.cover > 0.85)
  const [topC, underC] = wet ? RAIN_INK[a.sky.dark ? 'dark' : 'light'] : CLOUD_INK[a.phase]
  const low = Math.max(0, Math.min(1, a.sun.alt / 14))
  const sun = mix('#FF7A3D', '#FFF3C4', low)
  // Far hills are the sky's own colour with a little ink in it; nearer ones hold more
  const far = hillInk(a, 0.3), near = hillInk(a, 0.58)
  return (
    <>
      <radialGradient id={`${id}-sunglow`}><stop offset="0" stopColor={sun} stopOpacity=".85" /><stop offset=".35" stopColor={sun} stopOpacity=".3" /><stop offset="1" stopColor={sun} stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-moonglow`}><stop offset="0" stopColor="#E9EEFF" stopOpacity=".5" /><stop offset="1" stopColor="#E9EEFF" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-ember`}><stop offset="0" stopColor="#FF9A5C" stopOpacity=".8" /><stop offset="1" stopColor="#FF9A5C" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stopColor={topC} /><stop offset="1" stopColor={underC} /></linearGradient>
      <linearGradient id={`${id}-hill1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={far} /><stop offset=".3" stopColor={far} stopOpacity=".8" /><stop offset=".62" stopColor={far} stopOpacity=".34" /><stop offset="1" stopColor={far} stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-hill2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={near} /><stop offset=".3" stopColor={near} stopOpacity=".8" /><stop offset=".62" stopColor={near} stopOpacity=".34" /><stop offset="1" stopColor={near} stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}-fog`}><stop offset="0" stopColor="#F3F4F2" stopOpacity=".85" /><stop offset="1" stopColor="#F3F4F2" stopOpacity="0" /></radialGradient>
    </>
  )
}

/** The sun, with its glow: lower and redder toward the horizon, dimmer the more cloud there is. */
function Sun({ id, a, at, r = 10 }) {
  const low = Math.max(0, Math.min(1, a.sun.alt / 14)), seen = 1 - Math.min(0.92, a.weather.cover * 0.95)
  return (
    <g opacity={seen} pointerEvents="none">
      <circle cx={at.x} cy={at.y} r={r * (5.4 - low * 1.6)} fill={`url(#${id}-sunglow)`} className="ac-sunglow" />
      <circle cx={at.x} cy={at.y} r={r} fill={mix('#FF7A3D', '#FFF7DA', low)} />
    </g>
  )
}

/** The moon in tonight's phase: by day only its lit part shows, pale in the blue. */
export function Moon({ id, a, at, r = 8 }) {
  const day = a.daylight > 0.5, night = a.phase === 'night', seen = 1 - Math.min(0.9, a.weather.cover * 0.95)
  return (
    <g opacity={seen * (day ? 0.6 : 1)} pointerEvents="none">
      {night && <circle cx={at.x} cy={at.y} r={r * 3.2} fill={`url(#${id}-moonglow)`} opacity={0.3 + a.moon.fraction * 0.7} />}
      <g transform={`translate(${at.x} ${at.y})${a.moon.waning ? ' scale(-1 1)' : ''}`}>
        {night && <circle r={r} fill="#3A3558" opacity=".55" />}
        <path d={moonLitPath(a.moon.fraction, r)} fill={day ? '#F6F3EA' : '#F4EBD0'} />
      </g>
    </g>
  )
}

/** One cloud, drifting the way the wind blows; under less motion it rests where it started. */
export function Cloud({ id, n, total, a, span, y, scale, shape, pad = 60, pace = 1 }) {
  const [x0, x1] = span, wide = x1 - x0 + pad * 2, to = a.wind.to
  const from = to > 0 ? x0 - pad : x1 + pad, end = from + to * wide
  const at = (n + 0.35) / total
  const dur = a.wind.drift * pace * (0.85 + (n % 3) * 0.14)
  return (
    <g className="ac-cloud" style={{ '--x0': `${x0 + (x1 - x0) * at}px`, '--from': `${from}px`, '--to': `${end}px`, animationDuration: `${dur}s`, animationDelay: `${-dur * (to > 0 ? at : 1 - at)}s` }}>
      <path d={CLOUD_SHAPES[shape]} transform={`translate(0 ${y}) scale(${scale})`} fill={`url(#${id}-cloud)`} opacity={a.sky.dark ? 0.78 : 0.94} />
    </g>
  )
}

/**
 * The campus's sky, behind everything: the glow where the sun is rising or has just set, the sun and the moon,
 * two lines of far hills, a grey veil when it's overcast, and the clouds. `panel` is the drawing's own box
 * ({ x, y, w, h }); `sky` is where the heavens map to ({ x0, x1, horizon, zenith }).
 */
export function Sky({ id, a, panel, sky }) {
  const sun = skyPoint(a.sun.az, a.sun.alt, sky), moon = skyPoint(a.moon.az, a.moon.alt, sky)
  const r = seeded(`${a.date}-clouds`)
  const foggy = a.weather.kind === 'fog'
  const n = foggy ? 0 : cloudCount(a.weather.cover) // fog hides the sky: there are no clouds to pick out
  const clouds = Array.from({ length: n }, (_, k) => ({ y: sky.zenith + 16 + r() * (sky.horizon - sky.zenith - 46), scale: 0.75 + r() * 0.7, shape: Math.floor(r() * 3) }))
  const ember = a.sun.alt > -9 && a.sun.alt < 7 ? (1 - Math.abs(a.sun.alt + 1) / 8) * (1 - a.weather.cover * 0.8) : 0
  const veil = a.weather.cover > 0.6 ? ((a.weather.cover - 0.6) / 0.4) * (a.weather.wet ? 0.62 : 0.45) : 0
  const x0 = panel.x, x1 = panel.x + panel.w
  return (
    <g pointerEvents="none">
      {ember > 0.02 && <ellipse cx={sun.x} cy={sky.horizon} rx={panel.w * 0.34} ry="34" fill={`url(#${id}-ember)`} opacity={Math.min(0.9, ember)} />}
      {a.sun.alt > -3 && <Sun id={id} a={a} at={sun} />}
      {a.moon.alt > -3 && a.moon.fraction > 0.02 && <Moon id={id} a={a} at={moon} />}
      <g opacity={foggy ? 0.3 : 1}>
        <path d={ridge('far-hills', x0, x1, sky.horizon + 6, 10, sky.horizon + 70)} fill={`url(#${id}-hill1)`} />
        <path d={ridge('near-hills', x0, x1, sky.horizon + 15, 7, sky.horizon + 84, 11)} fill={`url(#${id}-hill2)`} />
      </g>
      {veil > 0 && <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill={a.sky.dark ? '#14141F' : '#8C95A2'} opacity={veil} />}
      {clouds.map((c, k) => <Cloud key={k} id={id} n={k} total={n} a={a} span={[x0, x1]} {...c} />)}
    </g>
  )
}

/** Soft patches of cloud shadow crossing the lawn on a day of sun and cloud. Inside a clip of the ground. */
export function CloudShadows({ a, panel, clip }) {
  if (a.daylight < 0.6 || a.weather.cover < 0.2 || a.weather.cover > 0.75) return null
  const to = a.wind.to, dur = a.wind.drift * 0.55
  return (
    <g clipPath={`url(#${clip})`} pointerEvents="none">
      {[0, 1].map((k) => (
        <g key={k} className="ac-cloud" style={{ '--x0': `${(k ? 0.2 : -0.25) * panel.w}px`, '--from': `${-to * panel.w * 0.9}px`, '--to': `${to * panel.w * 0.9}px`, animationDuration: `${dur}s`, animationDelay: `${-dur * (k ? 0.6 : 0.1)}s` }}>
          <ellipse cx="0" cy={panel.y + panel.h * (k ? 0.72 : 0.55)} rx={panel.w * 0.24} ry={panel.w * 0.085} fill="#16240F" opacity=".14" />
        </g>
      ))}
    </g>
  )
}

const LEAN = { calm: 0, breeze: 1, windy: 2, gale: 3 }
// Streaks for one tile of rain (40 wide, 120 tall): [x, y, length]
const STREAKS = [[4, 6, 13], [17, 38, 16], [31, 14, 12], [9, 72, 15], [26, 88, 13], [36, 54, 16], [14, 104, 12], [23, 22, 10]]
const FLAKES = [[5, 10, 1.5], [22, 30, 1.1], [34, 6, 1.7], [12, 58, 1.2], [29, 74, 1.6], [3, 92, 1.1], [18, 108, 1.5], [37, 44, 1.2]]

/**
 * Rain or snow over a box, as two sheets falling at different speeds: a tile of streaks (or flakes) repeated,
 * each sheet one moving shape, so a downpour costs no more than a drizzle. It leans the way the wind blows.
 */
export function Fall({ id, a, panel, kind = a.weather.kind === 'snow' ? 'snow' : 'rain', scale = 1 }) {
  const amount = a.weather.fall
  if (amount <= 0) return null
  const snow = kind === 'snow', lean = LEAN[a.wind.level] * a.wind.to
  const dx = snow ? 20 * (lean || a.wind.to * 0.5) : 40 * lean // how far a drop travels sideways for each tile it falls
  const ink = snow ? '#FFFFFF' : a.sky.dark ? '#A9BEDD' : '#E3EEF9'
  const marks = (list) => list.flatMap(([x, y, l], k) => [-40, 0, 40].flatMap((ox) => [-120, 0, 120].map((oy) => (
    snow ? <circle key={`${k}${ox}${oy}`} cx={x + ox} cy={y + oy} r={l} /> : <line key={`${k}${ox}${oy}`} x1={x + ox} y1={y + oy} x2={x + ox + (dx * l) / 120} y2={y + oy + l} />
  ))))
  const sheets = [
    { key: 'far', list: (snow ? FLAKES : STREAKS).filter((_, k) => k % 2 === 0), k: 0.7 * scale, secs: snow ? 9 : 0.82, opacity: snow ? 0.7 : 0.34 },
    ...(amount > 0.4 ? [{ key: 'near', list: snow ? FLAKES : STREAKS.slice(0, amount > 0.9 ? 8 : 6), k: scale, secs: snow ? 6 : 0.56, opacity: snow ? 0.95 : 0.55 }] : []),
  ]
  return (
    <g pointerEvents="none" className={snow ? 'ac-snowing' : 'ac-raining'}>
      <defs>
        {sheets.map((s) => (
          <pattern key={s.key} id={`${id}-fall-${s.key}`} width="40" height="120" patternUnits="userSpaceOnUse" patternTransform={`scale(${s.k})`}>
            <g stroke={ink} strokeWidth={snow ? 0 : 1.1} strokeLinecap="round" fill={ink}>{marks(s.list)}</g>
          </pattern>
        ))}
      </defs>
      {sheets.map((s) => (
        <rect key={s.key} className="ac-fall" x={panel.x - 160} y={panel.y - 130 * s.k} width={panel.w + 320} height={panel.h + 260 * s.k} fill={`url(#${id}-fall-${s.key})`} opacity={s.opacity}
          style={{ '--fx': `${dx * s.k}px`, '--fy': `${120 * s.k}px`, animationDuration: `${s.secs}s` }} />
      ))}
    </g>
  )
}

/** Rings where drops land: on the ground at `spots` ([{ x, y }]), one after another. */
export function Splashes({ spots, a }) {
  if (!a.weather.wet) return null
  return <g pointerEvents="none">{spots.map((p, k) => <ellipse key={k} className="ac-splash" cx={p.x} cy={p.y} rx="5" ry="2.2" fill="none" stroke="#EAF4FF" strokeWidth=".9" style={{ animationDelay: `${-(k * 0.37) % 1.3}s` }} />)}</g>
}

/** Fog: a pale veil, and three long banks of it sliding slowly past. */
export function Fog({ id, a, panel }) {
  if (a.weather.kind !== 'fog') return null
  return (
    <g pointerEvents="none">
      <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill={a.sky.dark ? '#5E6272' : '#E4E7E8'} opacity=".3" />
      {[0.3, 0.55, 0.8].map((f, k) => (
        <ellipse key={k} className="ac-fogbank" cx={panel.x + panel.w * (0.3 + k * 0.22)} cy={panel.y + panel.h * f} rx={panel.w * 0.62} ry={panel.h * 0.11} fill={`url(#${id}-fog)`} opacity={a.sky.dark ? 0.42 : 0.72}
          style={{ animationDuration: `${26 + k * 9}s`, animationDelay: `${-k * 7}s`, '--fog': `${(k % 2 ? -1 : 1) * a.wind.to * panel.w * 0.16}px` }} />
      ))}
    </g>
  )
}

/** A thunderstorm: the sky flickers now and then, and a bolt comes down behind the hills. */
export function Storm({ a, panel, sky }) {
  if (a.weather.kind !== 'thunder') return null
  const bolt = 'l-6 22l8 -3l-9 27l7 -3l-6 21'
  return (
    <g pointerEvents="none">
      {[[0.24, 9, 0], [0.71, 13, -5]].map(([f, secs, delay], k) => (
        <g key={k} className="ac-bolt" style={{ animationDuration: `${secs}s`, animationDelay: `${delay}s` }}>
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill="#F4F1FF" opacity=".34" />
          <path d={`M${panel.x + panel.w * f} ${sky.zenith + 8}${bolt}`} fill="none" stroke="#FFFBE0" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

/** A few birds crossing the sky on a fair day. */
export function Birds({ a, panel, sky }) {
  if (a.daylight < 0.7 || a.weather.wet || a.weather.kind === 'fog' || a.weather.kind === 'snow' || a.wind.level === 'gale') return null
  const r = seeded(`${a.date}-birds`), to = r() > 0.5 ? 1 : -1
  const y = sky.zenith + 22 + r() * 30, far = panel.w * 1.6
  return (
    <g className="ac-flock" pointerEvents="none" style={{ '--from': `${-to * far}px`, '--to': `${to * far}px`, '--x0': `${panel.w * 0.18}px` }}>
      {[[0, 0, 1], [-11, 5, 0.85], [-19, -3, 0.75]].map(([x, dy, s], k) => (
        <g key={k} transform={`translate(${x * to} ${y + dy}) scale(${s})`}>
          <path className="ac-wing" d="M-5 0Q-2.5 -3.4 0 0Q2.5 -3.4 5 0" fill="none" stroke={a.tone('#2B2019')} strokeWidth="1.3" strokeLinecap="round" style={{ animationDelay: `${-k * 0.17}s` }} />
        </g>
      ))}
    </g>
  )
}

/** Fireflies over the lawn on a warm, dry evening. `spots` are places on the ground ([{ x, y }]). */
export function Fireflies({ a, spots }) {
  const warm = a.season.ground === 'summer' || (a.season.ground === 'spring' && Number(a.date.slice(5, 7)) >= 5) || (a.season.ground === 'fall' && a.date.slice(5, 7) === '09')
  if (!warm || !a.dark || a.weather.wet || a.weather.kind === 'fog' || a.wind.level === 'gale' || a.wind.level === 'windy') return null
  return (
    <g pointerEvents="none">
      {spots.map((p, k) => (
        <g key={k} className="ac-firefly" style={{ animationDuration: `${7 + (k % 4) * 1.6}s`, animationDelay: `${-k * 1.3}s`, '--fa': `${(k % 2 ? -1 : 1) * (8 + (k % 3) * 4)}px`, '--fb': `${-6 - (k % 4) * 3}px` }}>
          <g className="ac-glimmer" style={{ animationDuration: `${2.2 + (k % 3) * 0.7}s`, animationDelay: `${-k * 0.5}s` }}>
            <circle cx={p.x} cy={p.y - 8} r="3.4" fill="#F4F59A" opacity=".28" />
            <circle cx={p.x} cy={p.y - 8} r="1.1" fill="#FBFCC8" />
          </g>
        </g>
      ))}
    </g>
  )
}
