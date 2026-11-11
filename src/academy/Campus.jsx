import { useState } from 'react'
import { pt, mid, tile, floorShapes, byDepth, TW, TH } from './iso.js'
import { ROOM_KINDS } from './rooms.js'
import { ITEM, itemSrc } from './items.js'
import { MASCOT } from './mascots.js'
import { shade } from './RoomScene.jsx'
import { atmosphereAt, mix, hull, lightOf, smokes, sceneryFor, roofLights, seeded, LIGHTS } from './atmosphere.js'
import { SkyDefs, Sky, CloudShadows, Fall, Splashes, Fog, Storm, Birds, Fireflies } from './Atmosphere.jsx'
import { useWander } from './useWander.js'

// The campus: a lawn with a little building on each room's square, her
// school's flag at the back, trees where nothing's been built, and above it
// all a star for every task she's finished this month. Tap a building to go
// in; in arranging, tap one and move it with the arrows.
//
// It stands under home's real sky (src/academy/atmosphere.js): the sun and the
// moon cross it where they really are, the clouds, rain and wind are the
// forecast's, the light is the hour's, shadows fall away from the sun, and at
// night each room's windows are lit while that kind of room is in use.

const BH = 34 // a building's height
const LAWN = { spring: '#7DB85A', summer: '#84B656', fall: '#93B45A', winter: '#8DAE72' }
const LITTER = { fall: ['#D9783A', '#C9452E', '#E9B44C', '#B5502E'], spring: ['#F9C2D1', '#FFFFFF', '#F4A3B8'] }
// How the flag flies, by the wind: [its lean at rest, its length at rest, its lean and length mid-ripple]
const FLAG = { calm: ['15deg', 0.62, '19deg', 0.57], breeze: ['0deg', 1, '4deg', 0.94], windy: ['-3deg', 1, '5deg', 0.9], gale: ['-5deg', 1.05, '6deg', 0.93] }
const LEAN = { calm: 0, breeze: 1, windy: 2, gale: 3 }
const GLOW_COLOURS = [...new Set(Object.values(LIGHTS).map((l) => l.colour))]
const glowId = (c) => `campus-glow-${c.slice(1)}`

export default function Campus({ rooms, n, colours = [], stars = 0, newStars = 0, arranging = false, selected, onOpen, onSelect, name, now = new Date(), atmos, mascots = [] }) {
  const a = atmos || atmosphereAt({ now })
  const tone = a.tone
  const w = n * TW, top = -BH - 104, h = n * TH - top + 30
  const panel = { x: -w / 2 - 12, y: top, w: w + 24, h }
  const sky = { x0: panel.x + 16, x1: panel.x + panel.w - 16, horizon: -14, zenith: top + 12 }
  const used = new Set(rooms.map((r) => `${r.cx},${r.cy}`))
  const f = floorShapes(n, 16)
  const [dark, green, gold] = [colours[0] || '#1C2B22', colours[1] || '#3FA34D', colours[2] || '#F2C14E']
  // Trees and flowers where nothing's built, the same every time; the flowers are the season's
  const scenery = [], free = []
  const blooms = sceneryFor(a.season)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (used.has(`${i},${j}`)) continue
    const v = (i * 7 + j * 13 + n) % 11
    if (v === 1 || v === 6) scenery.push({ i, j, k: (i + j) % 3 ? 'deciduous-tree' : 'evergreen-tree', s: 30, tree: true })
    else if (v === 3) scenery.push({ i, j, k: blooms[(i + j) % 4], s: 20 })
    else free.push({ i, j })
  }
  // The mascot has the run of the lawn by day, and sleeps by the flag at night
  const asleep = a.hour >= 21.5 || a.hour < 6
  const front = (p) => p.i + p.j - Math.abs(p.i - p.j) * 0.6 // toward the front and the middle, where it can be seen
  // Each mascot starts on its own square near the front, and they stroll apart
  const byFront = [...free].sort((p, q) => front(q) - front(p) || p.i - q.i)
  const homes = []
  mascots.filter((k) => MASCOT[k] && ITEM[MASCOT[k].art]).forEach((k, idx) => {
    const sq = byFront.length ? byFront[(1 + idx * 2) % byFront.length] : null
    if (sq && !homes.some((h) => h.i === sq.i && h.j === sq.j)) homes.push({ k, ...sq })
  })
  const taken = new Set([...used, ...scenery.map((s) => `${s.i},${s.j}`)])
  const roam = useWander(homes.map((h) => ({ id: h.k, i: h.i, j: h.j, reach: n })), taken, n, !arranging && !asleep && !a.weather.wet, 4200)
  const [hop, setHop] = useState({})
  const pets = homes.map((h) => ({ ...(roam[h.k] || h), k: h.k, mascot: true }))
  const things = [...rooms.map((r) => ({ ...r, i: r.cx, j: r.cy, room: true })), ...(arranging ? [] : scenery), ...(arranging ? [] : pets.map((pet) => (pet.from ? { ...pet, i: Math.max(pet.i, pet.from.i), j: Math.max(pet.j, pet.from.j), at: pet } : { ...pet, at: pet })))].sort(byDepth)
  const starPts = Array.from({ length: Math.min(stars, 120) }, (_, k) => { const p = Math.sin(k * 12.9898) * 43758.5453, q = Math.sin(k * 78.233) * 12345.678; return { x: -w / 2 + (p - Math.floor(p)) * w, y: top + 6 + (q - Math.floor(q)) * 84 } })

  // The ground, in the season's green and the hour's light
  const lawn = LAWN[a.season.ground] || LAWN.summer
  const r = seeded(`campus-${n}`)
  const litter = (LITTER[a.season.ground] || []).length ? Array.from({ length: n * 6 }, () => { const p = pt(r() * n, r() * n); return { ...p, turn: Math.round(r() * 180), c: LITTER[a.season.ground][Math.floor(r() * LITTER[a.season.ground].length)] } }) : []
  const spots = Array.from({ length: 12 }, () => pt(0.3 + r() * (n - 0.6), 0.3 + r() * (n - 0.6)))
  const puddles = a.weather.puddles ? free.filter((_, k) => (k * 5 + n) % 3 === 0).slice(0, 4) : []
  const lights = roofLights(a.season)
  const dim = 1 - 0.42 * (1 - a.daylight) // pictures can't be repainted in the hour's light, so they dim with it
  // Shadows on the ground, away from the sun (or a bright moon)
  const sh = a.shadow
  const cast = (p, height) => ({ x: p.x + sh.dx * height, y: p.y + sh.dy * height })
  const foot = (i, j, ins = 0.12) => [pt(i + ins, j + ins), pt(i + 1 - ins, j + ins), pt(i + 1 - ins, j + 1 - ins), pt(i + ins, j + 1 - ins)]
  const points = (list) => list.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg className={'campus-svg' + (arranging ? ' arranging' : '') + (a.sky.dark ? ' night' : '')} viewBox={`${panel.x} ${panel.y} ${panel.w} ${panel.h}`} role="img" aria-label={`${name}: ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}, and ${stars} ${stars === 1 ? 'star' : 'stars'} this month`}>
      <defs>
        <linearGradient id="campus-sky" x1="0" y1="0" x2="0" y2="1">{a.sky.g.map((c, k) => <stop key={k} offset={k / (a.sky.g.length - 1)} stopColor={c} />)}</linearGradient>
        <radialGradient id="star-glow"><stop offset="0" stopColor="#FFF6C8" stopOpacity=".9" /><stop offset="1" stopColor="#FFF6C8" stopOpacity="0" /></radialGradient>
        {GLOW_COLOURS.map((c) => <radialGradient key={c} id={glowId(c)}><stop offset="0" stopColor={c} stopOpacity=".9" /><stop offset=".45" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>)}
        <clipPath id="campus-lawn"><polygon points={f.top} /></clipPath>
        <clipPath id="campus-panel"><rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="6" /></clipPath>
        <SkyDefs id="campus" a={a} />
      </defs>
      <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} fill="url(#campus-sky)" rx="6" />
      <g clipPath="url(#campus-panel)"><Sky id="campus" a={a} panel={panel} sky={sky} /></g>
      {/* Her stars: a task done, a star */}
      {starPts.map((p, k) => (
        <g key={k} transform={`translate(${p.x} ${p.y})`} className={k >= stars - newStars ? 'star new' : 'star'}>
          <circle r="7" fill="url(#star-glow)" />
          <path d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3 Z" fill="#FFE27A" />
        </g>
      ))}
      <g clipPath="url(#campus-panel)"><Birds a={a} panel={panel} sky={sky} /></g>
      {/* The grounds */}
      <polygon points={f.left} fill={tone('#5A3E2B')} />
      <polygon points={f.right} fill={tone('#6E4B33')} />
      <polygon points={f.top} fill={tone(lawn)} />
      {Array.from({ length: n * n }, (_, k) => { const i = k % n, j = Math.floor(k / n); return (i + j) % 2 ? <polygon key={k} points={tile(i, j)} fill={tone(shade(lawn, -0.07))} /> : null })}
      {litter.map((l, k) => <ellipse key={k} cx={l.x} cy={l.y} rx="1.9" ry="1" fill={tone(l.c)} transform={`rotate(${l.turn} ${l.x} ${l.y})`} pointerEvents="none" />)}
      {puddles.map((p) => { const c = mid(p.i, p.j); return (
        <g key={`pd${p.i}-${p.j}`} pointerEvents="none">
          <ellipse cx={c.x} cy={c.y} rx="17" ry="7.5" fill={mix(a.sky.g[0], '#DDEBF5', 0.35)} opacity=".62" />
          <path d={`M${c.x - 10} ${c.y - 2} q5 -3 11 -1.5`} fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeLinecap="round" />
        </g>
      ) })}
      <CloudShadows a={a} panel={panel} clip="campus-lawn" />
      {arranging && Array.from({ length: n * n }, (_, k) => <polygon key={'g' + k} points={tile(k % n, Math.floor(k / n), 0.04)} className="room-grid" />)}
      {sh && (
        <g fill="#10200C" stroke="#10200C" opacity={sh.opacity} pointerEvents="none" clipPath="url(#campus-lawn)">
          <line x1="0" y1="2" x2={sh.dx * 92} y2={2 + sh.dy * 92} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx={sh.dx * 84 + a.wind.to * 9} cy={2 + sh.dy * 84} rx="12" ry="4" stroke="none" />
          {things.map((x) => {
            if (x.mascot) return null
            if (x.room) { if (x.kind === 'courtyard') return null; const p = foot(x.i, x.j); return <polygon key={x.id} points={points(hull([...p, ...p.map((q) => cast(q, BH + 3))]))} stroke="none" /> }
            const b = mid(x.i, x.j), tall = x.s * 0.72, far = cast(b, tall), len = Math.hypot(far.x - b.x, far.y - b.y), cx = b.x + (far.x - b.x) * 0.56, cy = b.y + 2 + (far.y - b.y) * 0.56
            return <ellipse key={`sh${x.i}-${x.j}`} cx={cx} cy={cy} rx={len * 0.5 + x.s * 0.12} ry={x.s * (x.tree ? 0.17 : 0.13)} transform={`rotate(${(Math.atan2(far.y - b.y, far.x - b.x) * 180) / Math.PI} ${cx} ${cy})`} stroke="none" />
          })}
        </g>
      )}
      <Splashes spots={spots} a={a} />
      {/* The flag at the back: it flies the way the wind blows, and hangs when there is none */}
      <g>
        <line x1="0" y1="2" x2="0" y2="-92" stroke={tone('#D8D2C8')} strokeWidth="3" />
        <g transform={a.wind.to < 0 ? 'scale(-1 1)' : undefined} style={{ '--f0': FLAG[a.wind.level][0], '--fs0': FLAG[a.wind.level][1], '--f1': FLAG[a.wind.level][2], '--fs1': FLAG[a.wind.level][3] }}>
          <g className="ac-flag" style={{ animationDuration: `${a.wind.flag}s` }}>
            <path d="M2 -90 h34 l-8 9 l8 9 h-34 Z" fill={tone(green)} stroke={tone(dark)} strokeWidth="1.5" />
            <rect x="2" y="-82.5" width="26" height="3" fill={tone(gold)} />
          </g>
        </g>
      </g>
      {things.map((x) => {
        if (x.room) return <Building key={x.id} r={x} a={a} picked={selected === x.id} arranging={arranging} roof={dark} trim={gold} lights={lights} onTap={() => (arranging ? onSelect(x.id) : onOpen(x.id))} />
        if (x.mascot) {
          const c = mid(x.at.i, x.at.j)
          return (
            <g key={`mascot-${x.k}`} className="ac-mascot" style={{ transform: `translate(${c.x}px, ${c.y}px)` }} onClick={() => setHop((v) => ({ ...v, [x.k]: (v[x.k] || 0) + 1 }))}>
              <title>{`The school’s ${MASCOT[x.k].label.toLowerCase()}${asleep ? ', asleep' : ''}`}</title>
              <ellipse cx="0" cy="2" rx="8" ry="3.2" fill="rgba(20, 30, 10, .24)" />
              <g key={`${x.at.step || 0}-${hop[x.k] || 0}`} className={(x.at.step || hop[x.k]) && !asleep ? 'ac-stride' : undefined}>
                <image href={itemSrc(MASCOT[x.k].art)} x="-12" y={asleep ? -17 : -21} width="24" height="24" opacity={asleep ? dim * 0.9 : Math.max(dim, 0.8)} transform={x.at.from && x.at.i - x.at.j < x.at.from.i - x.at.from.j ? 'scale(-1 1)' : undefined} />
              </g>
              {asleep && [0, 1, 2].map((z) => <text key={z} className="ac-zzz" x={8 + z * 4} y={-18 - z * 6} fontSize={6 + z * 1.5} style={{ animationDelay: `${z * 0.9}s` }}>z</text>)}
            </g>
          )
        }
        return <image key={`s${x.i}-${x.j}`} href={itemSrc(x.k)} x={mid(x.i, x.j).x - x.s / 2} y={mid(x.i, x.j).y - x.s * 0.9} width={x.s} height={x.s} opacity={dim} pointerEvents="none" className={x.tree ? 'ac-sway' : undefined} style={x.tree ? { '--sway': `${a.wind.sway * a.wind.to}deg`, animationDuration: `${2.2 + a.wind.flag}s`, animationDelay: `${-((x.i * 3 + x.j * 5) % 7) * 0.4}s` } : undefined} />
      })}
      <Fireflies a={a} spots={spots.slice(0, 8)} />
      {/* The weather, kept inside the picture: on a wide screen the drawing is narrower than its frame */}
      <g clipPath="url(#campus-panel)">
        <Fog id="campus" a={a} panel={panel} />
        <Fall id="campus" a={a} panel={panel} />
        <Storm a={a} panel={panel} sky={sky} />
      </g>
    </svg>
  )
}

/** A little building: two walls in its room's colour, a roof in the school's, its sign above; its windows lit after dark while the room is in use. */
function Building({ r, a, picked, arranging, roof, trim, lights, onTap }) {
  const k = ROOM_KINDS[r.kind] || ROOM_KINDS.classroom
  const tone = a.tone
  const wall = (r.style && r.style.wall) || k.wall
  const base = wall === 'glass' ? '#BFE3EC' : wall === 'none' ? '#7DB85A' : wall
  const i = r.cx, j = r.cy, ins = 0.12
  const A = pt(i + ins, j + ins), B = pt(i + 1 - ins, j + ins), C = pt(i + 1 - ins, j + 1 - ins), D = pt(i + ins, j + 1 - ins)
  const up = (p, h = BH) => `${p.x},${p.y - h}`
  const open = r.kind === 'courtyard'
  const m = mid(i, j)
  const lit = lightOf(r.kind, a.hour, a.dark)
  const glass = lit ? lit.colour : a.dark ? mix(tone(shade(base, -0.18)), '#070A18', 0.5) : tone('#FFE9A8')
  const snowy = a.weather.kind === 'snow'
  const glow = lit ? `url(#${glowId(lit.colour)})` : null
  const flick = lit && lit.flicker ? 'ac-candle' : undefined
  const smoke = !open && smokes(r.kind, a.hour)
  const chimney = r.kind === 'bakery' || r.kind === 'cafe'
  const along = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t - BH - 1 })
  const bulbs = lights && !open ? [0.14, 0.38, 0.62, 0.86].flatMap((t) => [along(D, C, t), along(C, B, t)]) : []
  return (
    <g className={'building' + (picked ? ' picked' : '')} onClick={(e) => { e.stopPropagation(); onTap() }} role="button" tabIndex={0} aria-label={arranging ? `Pick ${r.name} to move it` : `Go into ${r.name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}>
      <title>{r.name}</title>
      <ellipse cx={m.x} cy={m.y + 4} rx="26" ry="10" fill="rgba(20, 30, 10, .17)" />
      {open ? (
        <>
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`} fill={tone('#9CCB7A')} stroke={tone('#E8DCC0')} strokeWidth="3" />
          <image href={itemSrc(k.sign)} x={m.x - 15} y={m.y - 26} width="30" height="30" opacity={1 - 0.3 * (1 - a.daylight)} />
        </>
      ) : (
        <>
          {lit && <g className={flick} pointerEvents="none"><ellipse cx={C.x + 12} cy={C.y + 1} rx="18" ry="8" fill={glow} opacity=".62" /><ellipse cx={D.x + 12} cy={D.y + 5} rx="15" ry="6.5" fill={glow} opacity=".46" /></g>}
          <polygon points={`${D.x},${D.y} ${C.x},${C.y} ${up(C)} ${up(D)}`} fill={tone(shade(base, -0.18))} />
          <polygon points={`${C.x},${C.y} ${B.x},${B.y} ${up(B)} ${up(C)}`} fill={tone(shade(base, 0.08))} />
          {/* windows and a door */}
          <g className={flick}>
            {lit && <><ellipse cx={D.x + 10} cy={D.y - 16} rx="12" ry="11" fill={glow} opacity=".72" /><ellipse cx={C.x + 19} cy={C.y - 23} rx="11" ry="11" fill={glow} opacity=".72" /></>}
            <polygon points={`${D.x + 6},${D.y + 3 - 18} ${D.x + 14},${D.y + 7 - 18} ${D.x + 14},${D.y + 7 - 8} ${D.x + 6},${D.y + 3 - 8}`} fill={glass} opacity={lit ? 1 : 0.9} />
            <polygon points={`${C.x + 16},${C.y - 8 - 18} ${C.x + 22},${C.y - 11 - 18} ${C.x + 22},${C.y - 11 - 9} ${C.x + 16},${C.y - 8 - 9}`} fill={glass} opacity={lit ? 1 : 0.9} />
          </g>
          <polygon points={`${C.x + 5},${C.y - 3} ${C.x + 13},${C.y - 7} ${C.x + 13},${C.y - 7 - 16} ${C.x + 5},${C.y - 3 - 16}`} fill={tone(shade(base, -0.45))} />
          {/* the roof */}
          <polygon points={`${up(A, BH)} ${up(B, BH)} ${up(C, BH)} ${up(D, BH)}`} fill={tone(roof)} />
          <polygon points={`${up(A, BH + 3)} ${up(B, BH + 3)} ${up(C, BH + 3)} ${up(D, BH + 3)}`} fill={snowy ? mix(tone(shade(roof, 0.18)), '#FFFFFF', 0.72) : tone(shade(roof, 0.18))} />
          <polyline points={`${up(D, BH)} ${up(C, BH)} ${up(B, BH)}`} fill="none" stroke={tone(trim)} strokeWidth="2" />
          {chimney && <polygon points={`${m.x + 7},${m.y - BH - 2} ${m.x + 13},${m.y - BH - 5} ${m.x + 13},${m.y - BH - 15} ${m.x + 7},${m.y - BH - 12}`} fill={tone(shade(base, -0.4))} />}
          {smoke && [0, 1, 2].map((s) => <circle key={s} className="ac-smoke" cx={m.x + 10} cy={m.y - BH - 15} r="4" fill={tone('#F4EFE6')} style={{ animationDelay: `${-s * 1.3}s`, '--sx': `${a.wind.to * (6 + LEAN[a.wind.level] * 9)}px` }} pointerEvents="none" />)}
          {bulbs.map((p, n2) => (
            <g key={n2} className={n2 % 3 ? undefined : 'ac-twinkle'} pointerEvents="none">
              {a.dark && <circle cx={p.x} cy={p.y + 2} r="4.2" fill={lights[n2 % lights.length]} opacity=".3" />}
              <circle cx={p.x} cy={p.y + 2} r="1.7" fill={a.dark ? lights[n2 % lights.length] : tone(lights[n2 % lights.length])} />
            </g>
          ))}
          <g className="sign"><image href={itemSrc(k.sign)} x={m.x - 15} y={m.y - BH - 40} width="30" height="30" opacity={1 - 0.22 * (1 - a.daylight)} /></g>
        </>
      )}
      {picked && <polygon points={tile(i, j, 0.02)} className="room-picked" />}
    </g>
  )
}
