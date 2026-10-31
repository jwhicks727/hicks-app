// Pictures of the sky's events, drawn here on a 320 x 170 stage. Motion is
// transforms and opacity, and stops under less motion (calendar.css).

const stars = (n, seed = 1, h = 170) => Array.from({ length: n }, (_, i) => {
  const r = (k) => ((Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453) % 1 + 1) % 1
  return <circle key={i} className="astro-star" cx={(r(1) * 320).toFixed(1)} cy={(r(2) * h).toFixed(1)} r={(0.5 + r(3) * 1.1).toFixed(2)} fill="#FFFFFF" opacity={(0.4 + r(4) * 0.6).toFixed(2)} style={{ animationDelay: `${(r(5) * 4).toFixed(2)}s` }} />
})
const Night = ({ id, children, glow = '#2E2A5C' }) => (
  <svg className="astro-art" viewBox="0 0 320 170" role="img" aria-hidden="true">
    <defs><linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E0C24" /><stop offset="1" stopColor={glow} /></linearGradient></defs>
    <rect width="320" height="170" fill={`url(#${id}-sky)`} />
    {children}
  </svg>
)
const Maria = ({ cx, cy, r, fill = '#BFB28A' }) => [[-.3, -.25, .28], [.2, -.1, .22], [-.05, .3, .18], [.35, .3, .12], [-.4, .15, .1]].map(([x, y, s], i) => <ellipse key={i} cx={cx + x * r} cy={cy + y * r} rx={s * r} ry={s * r * 0.8} fill={fill} opacity=".45" />)

function FullMoon({ big }) {
  const r = big ? 56 : 46
  return (
    <Night id="fm">
      <defs><radialGradient id="fm-glow"><stop offset=".55" stopColor="#FFF4CF" stopOpacity=".55" /><stop offset="1" stopColor="#FFF4CF" stopOpacity="0" /></radialGradient></defs>
      {stars(40, 2)}
      <circle className="astro-breathe" cx="160" cy="88" r={r * 1.9} fill="url(#fm-glow)" />
      <circle cx="160" cy="88" r={r} fill="#F6EBC4" /><Maria cx={160} cy={88} r={r} />
    </Night>
  )
}
function LunarEclipse({ type }) {
  return (
    <Night id="le" glow="#3A1A2A">
      <defs>
        <radialGradient id="le-copper" cx=".4" cy=".35"><stop offset="0" stopColor="#E07A3F" /><stop offset=".7" stopColor="#8B2E16" /><stop offset="1" stopColor="#4A160A" /></radialGradient>
        <clipPath id="le-moon"><circle cx="160" cy="88" r="48" /></clipPath>
      </defs>
      {stars(46, 3)}
      {type === 'total' && <><circle cx="160" cy="88" r="60" fill="#C4501F" opacity=".25" className="astro-breathe" /><circle cx="160" cy="88" r="48" fill="url(#le-copper)" /><Maria cx={160} cy={88} r={48} fill="#5A1A0C" /></>}
      {type !== 'total' && (
        <>
          <circle cx="160" cy="88" r="48" fill="#F6EBC4" /><Maria cx={160} cy={88} r={48} />
          <g clipPath="url(#le-moon)"><circle className="astro-shadow" cx={type === 'partial' ? 108 : 92} cy="70" r="70" fill={type === 'partial' ? '#5A1E12' : '#2B2440'} opacity={type === 'partial' ? 0.88 : 0.35} /></g>
        </>
      )}
    </Night>
  )
}
function SolarEclipse({ type }) {
  const ring = type === 'annular' || type === 'hybrid'
  return (
    <Night id="se" glow="#1B1838">
      <defs><radialGradient id="se-corona"><stop offset=".42" stopColor="#FFFFFF" stopOpacity=".95" /><stop offset=".6" stopColor="#FFE8B0" stopOpacity=".45" /><stop offset="1" stopColor="#FFE8B0" stopOpacity="0" /></radialGradient></defs>
      {stars(24, 4)}
      {type === 'partial' ? <><circle cx="160" cy="88" r="40" fill="#FFC94D" /><circle cx="182" cy="76" r="40" fill="#141230" /></>
        : <><circle className="astro-breathe" cx="160" cy="88" r={ring ? 52 : 86} fill={ring ? '#FFB13B' : 'url(#se-corona)'} /><circle cx="160" cy="88" r={ring ? 44 : 40} fill="#0B0A1C" /></>}
    </Night>
  )
}
function NewMoon() {
  return (
    <Night id="nm" glow="#1F1B44">
      <defs><linearGradient id="nm-band" x1="0" y1="1" x2="1" y2="0"><stop offset=".25" stopColor="#B9A8E8" stopOpacity="0" /><stop offset=".5" stopColor="#E8DDF8" stopOpacity=".35" /><stop offset=".75" stopColor="#B9A8E8" stopOpacity="0" /></linearGradient></defs>
      <rect width="320" height="170" fill="url(#nm-band)" />
      {stars(110, 5)}
    </Night>
  )
}
function Meteors() {
  return (
    <Night id="mt">
      {stars(60, 6)}
      <circle cx="248" cy="36" r="3" fill="#FFFFFF" opacity=".9" />
      {[[230, 44, 120], [240, 50, 90], [222, 30, 150], [252, 58, 70], [214, 46, 110]].map(([x, y, len], i) => (
        <line key={i} className="astro-meteor" x1={x} y1={y} x2={x - len} y2={y + len * 0.55} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </Night>
  )
}
function SunPaths({ season }) {
  const arcs = { summer: 22, spring: 54, autumn: 54, winter: 86 }
  const now = arcs[season]
  return (
    <svg className="astro-art" viewBox="0 0 320 170" role="img" aria-hidden="true">
      <defs><linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FB6E6" /><stop offset="1" stopColor="#F6D9A8" /></linearGradient></defs>
      <rect width="320" height="170" fill="url(#sp-sky)" />
      {[['Jun', 22], ['Mar · Sep', 54], ['Dec', 86]].map(([l, top]) => (
        <g key={l}>
          <path d={`M30 140 Q160 ${top * 2 - 140 + 40} 290 140`} fill="none" stroke={top === now ? '#E07A1F' : '#FFFFFF'} strokeWidth={top === now ? 4 : 2} strokeDasharray={top === now ? '' : '5 6'} opacity={top === now ? 1 : 0.8} />
          <text x="160" y={top + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={top === now ? '#7A3A0A' : '#FFFFFF'} fontFamily="Nunito, sans-serif">{l}</text>
        </g>
      ))}
      <circle className="astro-breathe" cx="160" cy={now + 18} r="11" fill="#FFC94D" stroke="#FFFFFF" strokeWidth="2" />
      <rect y="140" width="320" height="30" fill="#8DB46F" /><rect y="140" width="320" height="3" fill="#6E9A55" />
    </svg>
  )
}

export default function AstroArt({ event }) {
  if (event.kind === 'full') return <FullMoon big={event.supermoon} />
  if (event.kind === 'new') return <NewMoon />
  if (event.kind === 'eclipse-lunar') return <LunarEclipse type={event.type} />
  if (event.kind === 'eclipse-solar') return <SolarEclipse type={event.type} />
  if (event.kind === 'meteors') return <Meteors />
  if (event.kind === 'season') return <SunPaths season={event.season} />
  return null
}
