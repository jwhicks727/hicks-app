import { useRef, useState } from 'react'
import { pt, mid, tile, floorShapes, wallShapes, wallMatrix, wallLength, cellAt, byDepth, roomBox } from './iso.js'
import { ROOM_N } from './rooms.js'
import { itemSrc } from './items.js'
import { menuFor } from './school.js'
import { HOME_TOWN, moonLitPath } from '../lib/sky.js'
import { atmosphereAt, beamOf, lightOf, ridge, seeded as rng } from './atmosphere.js'
import { SkyDefs, Sky, Cloud, Moon, Fall, Splashes, Fog, Storm, CloudShadows, cloudCount, hillInk, sunInk, moonShows } from './Atmosphere.jsx'
import { gait, glowOf, risesFrom, idleOf } from './life.js'
import { useWander } from './useWander.js'

// One room, drawn: a floor slab, two back walls with their details (a window
// showing the real sky, a clock telling the real time, the room's own board
// or shelves or curtains), and the things in it, nearest in front. In
// arranging, a thing is picked with a tap and moved with the arrows, or
// dragged (a mouse or a finger).
//
// The room lives in home's real air (src/academy/atmosphere.js): the window
// looks out on the sky as it is, with its clouds and its rain; the patch of
// sun on the floor is where the sun really throws it at this hour (and the
// moon's, on a bright night); the evening dims the room and whatever gives
// light glows. What's in the room stirs by what it is (src/academy/life.js):
// animals stroll, a cup steams, a flask bubbles, an instrument lets a note go.

const N = ROOM_N, H = 150, WL = wallLength(N), BASE = 62
// The window in the right-hand wall, in the wall's own units (32 to a square), and its four panes with the
// glazing bars between them: each pane throws its own patch of light
const WIN = { x: 48, y: -112, w: 64, h: 70 }
const PANES = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r]) => ({
  from: (WIN.x + c * (WIN.w / 2 + 1.5)) / 32, to: (WIN.x + WIN.w / 2 - 1.5 + c * (WIN.w / 2 + 1.5)) / 32,
  sill: -(WIN.y + WIN.h) + r * (WIN.h / 2 + 1.5), top: -(WIN.y + WIN.h) + WIN.h / 2 - 1.5 + r * (WIN.h / 2 + 1.5),
}))
// The chapel's stained glass, as five slices of colour for the light it lets fall
const STAINED = ['#B3263A', '#E0A320', '#2F5FA8', '#3E7A4C', '#8A5BC4']
const GLASS = STAINED.map((_, k) => ({ from: (70 + k * 10.4) / 32, to: (70 + (k + 1) * 10.4) / 32, sill: 40, top: 118 }))

export const shade = (hex, amt) => {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
const light = (hex) => { const n = parseInt(hex.replace('#', ''), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 150 }
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '')
const glowId = (id, c) => `${id}-glow-${c.slice(1)}`

export default function RoomScene({ room, kind, items, arranging = false, selected, onSelect, onDrop, urlFor, assetOf, extras = {}, now = new Date(), atmos, id = 'r' }) {
  const svg = useRef(null), drag = useRef(null)
  const [hop, setHop] = useState(null)
  const a = atmos || atmosphereAt({ now })
  const style = room.style || {}
  const wall = style.wall || kind.wall
  const floor = style.floor || kind.floor
  const detail = kind.detail
  const box = roomBox(N, H)
  const night = a.sky.dark
  const outdoors = wall === 'none', glassy = wall === 'glass', open = outdoors || glassy
  const f = floorShapes(N), w = wallShapes(N, H)
  const seed = room.id || room.kind

  // What stirs: animals stroll from the square they were put on (never while arranging, and they sleep at night)
  const asset = (k) => (k.startsWith('a:') && assetOf ? assetOf(k.slice(2)) : null)
  const asleep = a.hour >= 21.5 || a.hour < 6
  const gaits = Object.fromEntries(items.map((it) => [it.id, gait(it.k, asset(it.k), floor)]))
  const walkers = items.filter((it) => gaits[it.id] === 'walk' || gaits[it.id] === 'swim')
  const roam = useWander(walkers.map((it) => ({ id: it.id, i: it.i, j: it.j })), new Set(items.filter((it) => !walkers.includes(it)).map((it) => `${it.i},${it.j}`)), N, !arranging && !asleep, 2400)
  const placed = items.map((it) => { const at = (!arranging && roam[it.id]) || null; return at ? { ...it, at, di: Math.max(at.i, at.from ? at.from.i : at.i), dj: Math.max(at.j, at.from ? at.from.j : at.j) } : { ...it, di: it.i, dj: it.j } })
  const sorted = placed.sort((p, q) => byDepth({ i: p.di, j: p.dj }, { i: q.di, j: q.dj }))
  const glows = sorted.map((it) => [it, glowOf(it.k, asset(it.k))]).filter(([, g]) => g && (a.dark || g.always))
  const glowColours = [...new Set([...glows.map(([, g]) => g.colour), '#FFD98A'])]
  let rising = 0

  const toCell = (e) => {
    const p = svg.current.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    const q = p.matrixTransform(svg.current.getScreenCTM().inverse())
    return cellAt(q.x, q.y, N)
  }
  const down = (e, it) => {
    e.stopPropagation()
    if (!arranging) { setHop(it.id); setTimeout(() => setHop(null), 700); return }
    onSelect(it.id)
    drag.current = { id: it.id, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => {
    if (!drag.current) return
    const c = toCell(e)
    if (c) { drag.current.moved = true; onDrop(drag.current.id, c, false) }
  }
  const up = () => { if (drag.current && drag.current.moved) onDrop(drag.current.id, null, true); drag.current = null }

  // The hour's light over the room. A courtyard takes the full night. Indoors the evening only dims a room a
  // little while its lights are on (the hours its windows are lit on the campus), and more once they're out
  const lightsOn = lightOf(room.kind, a.hour, a.dark)
  const washes = outdoors ? a.washes : a.dark ? a.washesIn.map(([tint, k]) => [tint, Math.min(0.52, k * (lightsOn ? 0.8 : 1.3))]) : a.washesIn
  const panel = { x: box.x, y: box.y, w: box.w, h: box.h }
  const heavens = { x0: box.x + 16, x1: box.x + box.w - 16, horizon: -40, zenith: box.y + 14 }
  const wallArgs = { detail, wall, id, night, now: a.now, a, extras, urlFor, seed }
  const left = wall !== 'none' ? WallDetails({ side: 'left', ...wallArgs }) : null, right = wall !== 'none' ? WallDetails({ side: 'right', ...wallArgs }) : null
  const sunny = a.beam && !glassy && !outdoors
  const panes = detail === 'chapel' ? GLASS : ['stars', 'gym', 'pool', 'theater'].includes(detail) ? [] : PANES
  const beams = sunny ? panes.map((pane) => beamOf(a.beam, pane, N, H)) : []
  const spots = Array.from({ length: 9 }, (_, k) => { const r = rng(`${seed}-rain-${k}`); return pt(0.4 + r() * (N - 0.8), 0.4 + r() * (N - 0.8)) })

  return (
    <svg ref={svg} className={'room-svg' + (arranging ? ' arranging' : '') + (night ? ' night' : '')} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={`${room.name}, with ${items.length} things in it`}
      onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={() => arranging && onSelect(null)}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">{a.sky.g.map((c, k) => <stop key={k} offset={k / (a.sky.g.length - 1)} stopColor={c} />)}</linearGradient>
        <linearGradient id={`${id}-wallshade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".16" /><stop offset=".5" stopColor="#000" stopOpacity="0" /></linearGradient>
        <radialGradient id={`${id}-water`} cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#7FD6E8" /><stop offset="1" stopColor="#2E8FB5" /></radialGradient>
        {glowColours.map((c) => <radialGradient key={c} id={glowId(id, c)}><stop offset="0" stopColor={c} stopOpacity=".85" /><stop offset=".5" stopColor={c} stopOpacity=".3" /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>)}
        <clipPath id={`${id}-box`}><rect x={box.x} y={box.y} width={box.w} height={box.h} rx="6" /></clipPath>
        <clipPath id={`${id}-floor`}><polygon points={f.top} /></clipPath>
        <SkyDefs id={id} a={a} />
      </defs>

      {/* A courtyard and a greenhouse stand under the open sky: the same one the campus has */}
      {open && (
        <g clipPath={`url(#${id}-box)`} pointerEvents="none">
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${id}-sky)`} />
          <Sky id={id} a={a} panel={panel} sky={heavens} />
          {glassy && <><Fog id={id} a={a} panel={panel} /><Fall id={`${id}-out`} a={a} panel={panel} /></>}
        </g>
      )}

      {/* The floor slab and the floor */}
      <polygon points={f.left} fill={shade(floorBase(floor), -0.35)} />
      <polygon points={f.right} fill={shade(floorBase(floor), -0.22)} />
      <polygon points={f.top} fill={floorBase(floor)} />
      <Floor style={floor} seed={seed} id={id} />

      {/* The walls, and everything on them */}
      {wall !== 'none' && (
        <>
          <polygon points={w.left} fill={glassy ? 'rgba(206, 236, 245, .42)' : shade(wall, -0.14)} />
          <polygon points={w.right} fill={glassy ? 'rgba(220, 244, 250, .36)' : wall} />
          <polygon points={w.left} fill={`url(#${id}-wallshade)`} />
          <polygon points={w.right} fill={`url(#${id}-wallshade)`} />
          <polygon points={w.capLeft} fill={glassy ? '#E9F6FA' : shade(wall, 0.35)} />
          <polygon points={w.capRight} fill={glassy ? '#F2FAFC' : shade(wall, 0.45)} />
          <g transform={wallMatrix('left', N)}>{left.base}</g>
          <g transform={wallMatrix('right', N)}>{right.base}</g>
        </>
      )}
      {wall === 'none' && <Hedges />}

      {/* The light of the hour, laid over the room; then whatever shines through it or by itself */}
      {washes.map(([tint, k], n) => (
        <g key={n} fill={tint} opacity={k} pointerEvents="none">
          <polygon points={f.top} /><polygon points={f.left} /><polygon points={f.right} />
          {wall !== 'none' && !glassy && <><polygon points={w.left} /><polygon points={w.right} /><polygon points={w.capLeft} /><polygon points={w.capRight} /></>}
        </g>
      ))}
      {wall !== 'none' && (
        <>
          <g transform={wallMatrix('left', N)}>{left.lit}</g>
          <g transform={wallMatrix('right', N)}>{right.lit}</g>
        </>
      )}
      {beams.some(Boolean) && (
        <g pointerEvents="none" className={a.weather.kind === 'partly' ? 'ac-sunbeam' : undefined}>
          {beams.map((b, k) => b && (
            <g key={k} fill={detail === 'chapel' ? STAINED[k] : a.beam.colour}>
              {b.floor.length > 0 && <polygon points={b.floor.map((q) => { const c = pt(q.i, q.j); return `${c.x},${c.y}` }).join(' ')} opacity={a.beam.strength * (detail === 'chapel' ? 1.25 : 1)} />}
              {b.wall.length > 0 && <polygon points={b.wall.map((q) => { const c = pt(0, q.j); return `${c.x},${c.y - q.z}` }).join(' ')} opacity={Math.min(0.55, a.beam.strength * 1.7)} />}
            </g>
          ))}
          {a.beam.of === 'sun' && a.beam.strength >= 0.2 && <Motes beams={beams} seed={seed} />}
        </g>
      )}
      {detail === 'theater' && <ellipse className="ac-limelight" cx={mid(2, 2).x + 16} cy={mid(2, 2).y + 30} rx="52" ry="24" fill={`url(#${glowId(id, '#FFD98A')})`} opacity=".7" pointerEvents="none" />}
      {outdoors && <CloudShadows a={a} panel={{ ...panel, y: -60, h: 260 }} clip={`${id}-floor`} />}
      {outdoors && <Splashes spots={spots} a={a} />}

      {/* A faint grid while arranging, and the picked square */}
      {arranging && Array.from({ length: N * N }, (_, k) => <polygon key={k} points={tile(k % N, Math.floor(k / N), 0.03)} className="room-grid" />)}
      {arranging && selected && (() => { const it = items.find((x) => x.id === selected); return it ? <polygon points={tile(it.i, it.j, 0.02)} className="room-picked" /> : null })()}

      {/* The things in the room, back to front */}
      {sorted.map((it, n) => {
        const size = BASE * (it.s || 1), c = mid(it.i, it.j)
        const href = it.k.startsWith('a:') ? urlFor && urlFor(it.k.slice(2)) : itemSrc(it.k)
        if (!href) return null
        const g = (a.dark || (glowOf(it.k, asset(it.k)) || {}).always) && glowOf(it.k, asset(it.k))
        const way = gaits[it.id], idle = arranging ? null : way === 'hover' ? 'ac-hover' : way ? 'ac-breathe' : idleOf(it.k)
        const up2 = !arranging && rising < 9 ? risesFrom(it.k) : null
        if (up2) rising += 1
        const to = it.at ? mid(it.at.i, it.at.j) : c
        const snooze = asleep && way && way !== 'hover' && !arranging
        return (
          <g key={it.id} className={way && !arranging ? 'ac-walker' : undefined} style={way && !arranging ? { transform: `translate(${to.x - c.x}px, ${to.y - c.y}px)` } : undefined}>
            {g && <ellipse cx={c.x} cy={c.y + 2} rx={g.reach * 36} ry={g.reach * 18} fill={`url(#${glowId(id, g.colour)})`} opacity=".8" className={g.flicker ? 'ac-candle' : undefined} pointerEvents="none" />}
            <g className={'room-item' + (selected === it.id ? ' picked' : '') + (hop === it.id ? ' hop' : '')} onPointerDown={(e) => down(e, it)} onClick={(e) => e.stopPropagation() /* a tap on a thing isn't a tap on the empty room, which lets go of what's picked */} style={{ transformOrigin: `${c.x}px ${c.y}px` }}>
              <ellipse cx={c.x} cy={c.y + 2} rx={size * 0.34} ry={size * 0.13} fill="rgba(30, 15, 5, .2)" />
              {g && <circle cx={c.x} cy={c.y - size * 0.42} r={size * 0.62} fill={`url(#${glowId(id, g.colour)})`} opacity=".5" className={g.flicker ? 'ac-candle' : undefined} pointerEvents="none" />}
              <g key={it.at ? it.at.step : 0} className={it.at && it.at.step ? 'ac-stride' : undefined}>
                <g className={idle || undefined} style={idle ? { animationDelay: `${-(n % 5) * 0.83}s` } : undefined}>
                  <image href={href} x={c.x - size / 2} y={c.y - size * 0.86} width={size} height={size} opacity={outdoors ? 1 - 0.34 * (1 - a.daylight) : undefined} transform={it.f ? `translate(${2 * c.x} 0) scale(-1 1)` : undefined} style={it.h ? { filter: `hue-rotate(${it.h}deg)` } : undefined} />
                </g>
              </g>
            </g>
            {up2 && <Rising what={up2} x={c.x} y={c.y - size * 0.78} size={size} n={n} />}
            {snooze && [0, 1].map((z) => <text key={z} className="ac-zzz" x={c.x + size * 0.2 + z * 5} y={c.y - size * 0.7 - z * 7} fontSize={8 + z * 2} style={{ animationDelay: `${z * 0.9 + (n % 3) * 0.5}s` }}>z</text>)}
          </g>
        )
      })}

      {/* The weather where the room is open to it; a storm's flash reaches every room */}
      {outdoors && <g clipPath={`url(#${id}-box)`}><Fog id={id} a={a} panel={panel} /><Fall id={id} a={a} panel={panel} /><Storm a={a} panel={panel} sky={heavens} /></g>}
      {!open && a.weather.kind === 'thunder' && wall !== 'none' && (
        <g className="ac-bolt" style={{ animationDuration: '9s' }} fill="#F4F1FF" opacity=".14" pointerEvents="none"><polygon points={f.top} /><polygon points={w.left} /><polygon points={w.right} /></g>
      )}
    </svg>
  )
}

/** Dust in the sunlight: a few motes adrift above the brightest patch on the floor. */
function Motes({ beams, seed }) {
  const b = beams.find((x) => x && x.floor.length >= 3)
  if (!b) return null
  const r = rng(`${seed}-motes`)
  const lo = b.floor.reduce((m, q) => ({ i: Math.min(m.i, q.i), j: Math.min(m.j, q.j) }), { i: 99, j: 99 }), hi = b.floor.reduce((m, q) => ({ i: Math.max(m.i, q.i), j: Math.max(m.j, q.j) }), { i: -99, j: -99 })
  return Array.from({ length: 6 }, (_, k) => {
    const c = pt(lo.i + r() * (hi.i - lo.i + 1), lo.j + r() * (hi.j - lo.j))
    return <circle key={k} className="ac-mote" cx={c.x} cy={c.y - 8 - r() * 44} r={0.7 + r() * 0.7} fill="#FFF8E0" style={{ animationDuration: `${6 + r() * 5}s`, animationDelay: `${-r() * 8}s`, '--mx': `${(r() - 0.5) * 16}px`, '--my': `${-6 - r() * 12}px` }} />
  })
}

const SPARK = 'M0 -4L1 -1L4 0L1 1L0 4L-1 1L-4 0L-1 -1Z'
/** What rises from a thing: steam, bubbles, notes, sparkles, a flame's glow. Drawn in code, above it. */
function Rising({ what, x, y, size, n }) {
  const d = (k) => ({ animationDelay: `${-(k * 0.9 + (n % 4) * 0.4)}s` })
  if (what === 'steam') return <g pointerEvents="none" fill="none" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round">{[-5, 0, 5].map((dx, k) => <path key={k} className="ac-steam" d={`M${x + dx} ${y + 4}q-3 -4 0 -8q3 -4 0 -8`} style={d(k)} />)}</g>
  if (what === 'bubbles') return <g pointerEvents="none" fill="rgba(255, 255, 255, .3)" stroke="#FFFFFF" strokeWidth=".8">{[-6, 3, -1].map((dx, k) => <circle key={k} className="ac-bubble" cx={x + dx} cy={y + 6} r={2 + k * 0.8} style={{ ...d(k), '--bx': `${(k - 1) * 5}px` }} />)}</g>
  if (what === 'notes') return <g pointerEvents="none">{['♪', '♫'].map((c, k) => <text key={k} className="ac-note" x={x + (k ? 6 : -8)} y={y + 4} style={{ ...d(k * 1.6), '--nx': `${k ? 12 : -10}px` }}>{c}</text>)}</g>
  if (what === 'sparkles') return <g pointerEvents="none" fill="#FFF6C8">{[[-0.34, 0.1], [0.36, -0.12], [0.02, -0.3]].map(([dx, dy], k) => <g key={k} transform={`translate(${x + dx * size} ${y + dy * size + size * 0.3})`}><path className="ac-glint" d={SPARK} style={d(k * 1.3)} /></g>)}</g>
  if (what === 'flame') return <circle className="ac-candle" cx={x} cy={y + size * 0.1} r={size * 0.2} fill="#FFD27A" opacity=".5" pointerEvents="none" />
  return null
}

const FLOOR_BASE = { wood: '#C99A68', tile: '#E9EDEE', checker: '#F4E4C4', marble: '#EFEBE6', carpet: '#C98E8B', court: '#D9A86A', stone: '#B9B2A7', soil: '#7A5236', water: '#3FA6C8', grass: '#79B358', stage: '#5C3B2A', concrete: '#B7B3AE' }
const floorBase = (s) => FLOOR_BASE[s] || FLOOR_BASE.wood

/** The floor's own pattern, in floor-space (one square = one unit). */
function Floor({ style, seed, id }) {
  const r = rng(seed + style)
  const FM = 'matrix(32 16 -32 16 0 0)'
  const lines = (n, dir, colour, op = 1) => Array.from({ length: n - 1 }, (_, k) => {
    const v = (k + 1) * (N / n)
    return dir ? <line key={k} x1={0} y1={v} x2={N} y2={v} stroke={colour} strokeOpacity={op} vectorEffect="non-scaling-stroke" /> : <line key={k} x1={v} y1={0} x2={v} y2={N} stroke={colour} strokeOpacity={op} vectorEffect="non-scaling-stroke" />
  })
  const cells = (fill) => Array.from({ length: N * N }, (_, k) => { const i = k % N, j = Math.floor(k / N); const c = fill(i, j); return c ? <rect key={k} x={i} y={j} width="1" height="1" fill={c} /> : null })
  let body = null
  if (style === 'wood' || style === 'stage' || style === 'court') {
    const dark = style === 'stage' ? '#3E2619' : '#8A6440'
    body = (
      <>
        {lines(N * 3, true, dark, 0.5)}
        {Array.from({ length: N * 3 }, (_, k) => { const x = 0.5 + r() * (N - 1); return <line key={'j' + k} x1={x} y1={k / 3} x2={x} y2={(k + 1) / 3} stroke={dark} strokeOpacity=".45" vectorEffect="non-scaling-stroke" /> })}
        {Array.from({ length: 10 }, (_, k) => { const x = r() * N, y = Math.floor(r() * N * 3) / 3; return <rect key={'s' + k} x={x} y={y} width={Math.min(0.6 + r(), N - x)} height={1 / 3} fill="#FFF" opacity=".07" /> })}
        {style === 'court' && (
          <g fill="none" stroke="#FFF" strokeWidth=".06" opacity=".9">
            <rect x=".3" y=".3" width={N - 0.6} height={N - 0.6} />
            <line x1=".3" y1={N / 2} x2={N - 0.3} y2={N / 2} />
            <circle cx={N / 2} cy={N / 2} r=".9" />
            <path d={`M.3 ${N / 2 - 1.3} h1.4 v2.6 h-1.4`} />
          </g>
        )}
      </>
    )
  } else if (style === 'tile' || style === 'concrete') {
    body = <>{lines(N, true, '#9AA4A8', 0.45)}{lines(N, false, '#9AA4A8', 0.45)}{style === 'concrete' && Array.from({ length: 14 }, (_, k) => <circle key={k} cx={r() * N} cy={r() * N} r={0.08 + r() * 0.12} fill={['#E8546B', '#F2C14E', '#4A7FD6', '#5FA85A', '#8A5BC4'][k % 5]} opacity=".8" />)}</>
  } else if (style === 'checker') {
    body = cells((i, j) => ((i + j) % 2 ? '#D9573E' : null))
  } else if (style === 'marble') {
    body = <>{cells((i, j) => ((i + j) % 2 ? '#E2DCD3' : null))}{Array.from({ length: 6 }, (_, k) => <path key={k} d={`M${r() * N} ${r() * N} q${r() * 2 - 1} ${r() * 2 - 1} ${r() * 2} ${r() * 2}`} fill="none" stroke="#B9B0A3" strokeOpacity=".6" vectorEffect="non-scaling-stroke" />)}</>
  } else if (style === 'carpet') {
    body = <><rect x=".35" y=".35" width={N - 0.7} height={N - 0.7} fill="none" stroke="#F4D8B4" strokeWidth=".12" /><rect x=".6" y=".6" width={N - 1.2} height={N - 1.2} fill="none" stroke="#8C4F52" strokeWidth=".05" />{Array.from({ length: 16 }, (_, k) => <circle key={k} cx={1 + (k % 4) * 1.35} cy={1 + Math.floor(k / 4) * 1.35} r=".12" fill="#F4D8B4" opacity=".7" />)}</>
  } else if (style === 'stone') {
    body = cells(() => (r() > 0.5 ? '#A8A095' : '#C6BFB3'))
  } else if (style === 'soil') {
    body = <>{lines(N * 2, false, '#5A3A24', 0.6)}{Array.from({ length: 24 }, (_, k) => <circle key={k} cx={r() * N} cy={r() * N} r=".05" fill="#A47A55" />)}</>
  } else if (style === 'grass') {
    body = <>{cells((i, j) => ((i + j) % 2 ? '#6CA64C' : null))}{Array.from({ length: 30 }, (_, k) => <circle key={k} cx={r() * N} cy={r() * N} r=".06" fill={['#F7E26B', '#FFFFFF', '#F4A3B8'][k % 3]} />)}</>
  } else if (style === 'water') {
    body = <><rect width={N} height={N} fill={`url(#${id}-water)`} /><g className="room-waves">{Array.from({ length: 9 }, (_, k) => <path key={k} d={`M${0.4 + (k % 3) * 2} ${0.8 + Math.floor(k / 3) * 2} q.3 -.2 .6 0 t.6 0`} fill="none" stroke="#E6FAFF" strokeWidth=".06" opacity=".8" />)}</g><rect x="0" y="0" width={N} height={N} fill="none" stroke="#E6F4F8" strokeWidth=".25" /></>
  }
  return <g transform={FM} pointerEvents="none">{body}</g>
}

/** A low hedge where a courtyard's walls would be. */
function Hedges() {
  const bumps = (from, to) => Array.from({ length: 12 }, (_, k) => { const a = { x: from.x + (to.x - from.x) * (k + 0.5) / 12, y: from.y + (to.y - from.y) * (k + 0.5) / 12 }; return <circle key={k} cx={a.x} cy={a.y - 22} r="11" fill={k % 2 ? '#4E8A3E' : '#5B9A48'} /> })
  const l = pt(0, N), t = pt(0, 0), r = pt(N, 0)
  return (
    <g pointerEvents="none">
      <polygon points={`${l.x},${l.y} ${t.x},${t.y} ${t.x},${t.y - 22} ${l.x},${l.y - 22}`} fill="#3F7A34" />
      <polygon points={`${t.x},${t.y} ${r.x},${r.y} ${r.x},${r.y - 22} ${t.x},${t.y - 22}`} fill="#4E8A3E" />
      {bumps(l, t)}{bumps(t, r)}
    </g>
  )
}

/**
 * A window onto the real sky: far hills, the clouds as thick as they are and drifting with the wind, the rain on
 * the glass, a storm's flash. It looks south-west, so the sun going down shows in it, and the moon when it's
 * on that side: never when they're really somewhere else.
 */
function Window({ x, w = 64, h = 70, y = -112, id, frame = '#FFF8EE', a }) {
  const clip = `${id}-pane`
  const foggy = a.weather.kind === 'fog'
  const n = foggy ? 0 : Math.min(3, cloudCount(a.weather.cover))
  const seen = (b) => Math.abs(b.az - 225) < 62 && b.alt > -4 && b.alt < 38
  const place = (b) => ({ x: x + w * (0.5 + (b.az - 225) / 124), y: y + h * (0.8 - (b.alt / 38) * 0.72) })
  const veil = a.weather.cover > 0.6 ? ((a.weather.cover - 0.6) / 0.4) * (a.weather.wet ? 0.62 : 0.45) : 0
  const r = rng(`${a.date}-pane`)
  const sun = place(a.sun)
  return (
    <g>
      <clipPath id={clip}><rect x={x} y={y} width={w} height={h} /></clipPath>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-sky)`} />
      <g clipPath={`url(#${clip})`} pointerEvents="none">
        {seen(a.sun) && <g opacity={1 - Math.min(0.92, a.weather.cover * 0.95)}><circle cx={sun.x} cy={sun.y} r="24" fill={`url(#${id}-sunglow)`} /><circle cx={sun.x} cy={sun.y} r="6.5" fill={sunInk(a)} /></g>}
        {seen(a.moon) && a.daylight < 0.6 && moonShows(a) && <Moon id={id} a={a} at={place(a.moon)} r={5.5} />}
        {veil > 0 && <rect x={x} y={y} width={w} height={h} fill={a.sky.dark ? '#14141F' : '#8C95A2'} opacity={veil} />}
        <g opacity={foggy ? 0.25 : 1}>
          <path d={ridge('pane-far', x, x + w, y + h - 6, 5, y + h)} fill={hillInk(a, 0.3)} />
          <path d={ridge('pane-near', x, x + w, y + h - 1, 3.5, y + h, 7)} fill={hillInk(a, 0.6)} />
        </g>
        {Array.from({ length: n }, (_, k) => <Cloud key={k} id={id} n={k} total={n} a={a} span={[x, x + w]} y={y + 14 + r() * (h * 0.42)} scale={0.36 + r() * 0.2} shape={Math.floor(r() * 3)} pad={24} pace={0.45} />)}
        <Fall id={`${id}-pane`} a={a} panel={{ x, y, w, h }} scale={0.5} />
        {foggy && <rect x={x} y={y} width={w} height={h} fill={a.sky.dark ? '#5E6272' : '#E4E7E8'} opacity=".58" />}
        {a.weather.kind === 'thunder' && <rect className="ac-bolt" x={x} y={y} width={w} height={h} fill="#F4F1FF" style={{ animationDuration: '9s' }} />}
        {a.weather.wet && [0.2, 0.52, 0.8].map((fx, k) => <ellipse key={k} className="ac-drop" cx={x + w * fx} cy={y + 6 + k * 7} rx="1.1" ry="1.9" fill="#EEF6FF" style={{ animationDelay: `${-k * 1.7}s`, animationDuration: `${4.2 + k * 0.9}s`, '--drop': `${h * 0.62}px` }} />)}
        <path d={`M${x + 9} ${y}h9l-13 ${h}h-9Z`} fill="#FFFFFF" opacity={a.sky.dark ? 0.05 : 0.11} />
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={frame} strokeWidth="5" />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke={frame} strokeWidth="3" />
      <rect x={x - 5} y={y + h + 1} width={w + 10} height="6" fill={shade(frame, -0.12)} />
    </g>
  )
}

/** A clock that tells the time at home. */
function Clock({ x, y, r = 13, now, rim = '#3B2B22' }) {
  const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const hh = +hm.find((p) => p.type === 'hour').value % 12, mm = +hm.find((p) => p.type === 'minute').value
  const ha = ((hh + mm / 60) / 12) * 2 * Math.PI, ma = (mm / 60) * 2 * Math.PI
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#FFFDF7" stroke={rim} strokeWidth="2.5" />
      {Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * 2 * Math.PI; return <circle key={k} cx={x + Math.sin(a) * (r - 3.5)} cy={y - Math.cos(a) * (r - 3.5)} r=".9" fill={rim} /> })}
      <line x1={x} y1={y} x2={x + Math.sin(ha) * (r * 0.5)} y2={y - Math.cos(ha) * (r * 0.5)} stroke={rim} strokeWidth="2" strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + Math.sin(ma) * (r * 0.78)} y2={y - Math.cos(ma) * (r * 0.78)} stroke={rim} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  )
}

const Board = ({ x, y, w, h, fill, frame = '#8A6440' }) => <rect x={x} y={y} width={w} height={h} fill={fill} stroke={frame} strokeWidth="4" />
const Base = ({ wall }) => <><rect x="0" y="-8" width={WL} height="8" fill={wall === 'glass' ? '#9EC9D6' : shade(wall, -0.3)} /><rect x="0" y={-H} width={WL} height="5" fill={wall === 'glass' ? '#E9F6FA' : shade(wall, 0.2)} /></>

/** What's on a wall, by the kind of room. Left wall first, then right. */
/** Returns { base, lit }: `base` is dimmed with the room by the hour's light; `lit` (the window, lamps, neon, screens) is drawn over it. */
function WallDetails({ side, detail, wall, id, night, now, a, extras, urlFor, seed }) {
  const r = rng(seed + side)
  const ink = light(wall === 'glass' ? '#FFFFFF' : wall) ? '#2B2019' : '#FFF8EE'
  const L = side === 'left'
  const out = [<Base key="base" wall={wall} />], lit = []
  const done = () => ({ base: out, lit })

  if (wall === 'glass') {
    out.push(<g key="panes" stroke="#FFFFFF" strokeOpacity=".9" strokeWidth="2.5">{[1, 2, 3, 4, 5].map((k) => <line key={k} x1={k * 32} y1={-H} x2={k * 32} y2="0" />)}<line x1="0" y1={-H / 2} x2={WL} y2={-H / 2} /></g>)
    out.push(<rect key="shine" x="20" y={-H + 14} width="14" height={H - 40} fill="#FFF" opacity=".25" transform="skewX(-12)" />)
    return done()
  }

  if (L) {
    // The left wall: the room's board, shelves or curtains; a clock unless something fills the wall
    if (detail === 'tasks') {
      const list = (extras.tasks || []).slice(0, 4)
      out.push(
        <g key="board"><Board x={22} y={-118} w={140} h={78} fill="#2F5D46" />
          <text x={32} y={-100} className="chalk chalk-h">Today</text>
          {list.length ? list.map((t, k) => <text key={k} x={34} y={-84 + k * 12} className="chalk">{t.done_on ? '✓ ' : '○ '}{trunc(t.title, 22)}</text>) : <text x={34} y={-82} className="chalk">Nothing due. Go play!</text>}
          <rect x={108} y={-43} width={24} height={4} fill="#FFF" opacity=".8" /></g>,
      )
    } else if (detail === 'goals') {
      const goals = (extras.goals || []).filter((g) => !g.done_on).slice(0, 4)
      out.push(<g key="cork"><Board x={18} y={-122} w={130} h={84} fill="#C89B6D" frame="#7A4E2D" />
        {goals.length ? goals.map((g, k) => { const x = 26 + (k % 2) * 60, y = -114 + Math.floor(k / 2) * 38; const pct = g.ratio || 0; return (
          <g key={k}><rect x={x} y={y} width={54} height={32} fill={['#FCEB8C', '#F9C2D1', '#BFE3F2', '#C8F0B8'][k % 4]} transform={`rotate(${k % 2 ? 2 : -2} ${x + 27} ${y + 16})`} />
            <text x={x + 4} y={y + 12} className="note-t">{trunc(g.title, 11)}</text><rect x={x + 4} y={y + 20} width={46} height={5} fill="#FFF" /><rect x={x + 4} y={y + 20} width={46 * pct} height={5} fill="#3FA34D" /><circle cx={x + 27} cy={y + 2} r="2.4" fill="#D9463A" /></g>) })
          : <text x={30} y={-90} className="note-t">Goals go here</text>}
      </g>)
      out.push(<g key="diploma"><rect x={158} y={-110} width={26} height={34} fill="#FFF8EE" stroke="#C9A227" strokeWidth="2.5" /><circle cx={171} cy={-84} r="4" fill="#D9463A" /><line x1={163} y1={-102} x2={179} y2={-102} stroke="#8A6440" /><line x1={163} y1={-97} x2={179} y2={-97} stroke="#8A6440" /></g>)
    } else if (detail === 'shelves' || detail === 'bakery') {
      for (let row = 0; row < 3; row++) {
        const y = -130 + row * 40
        out.push(<rect key={'sh' + row} x={8} y={y + 32} width={WL - 16} height={5} fill="#5C3B22" />)
        if (detail === 'shelves') {
          let x = 12
          while (x < WL - 20) { const bw = 5 + r() * 6, bh = 20 + r() * 10; out.push(<rect key={`b${row}-${x}`} x={x} y={y + 32 - bh} width={bw} height={bh} fill={['#B3263A', '#3E7A4C', '#2F5FA8', '#E0A320', '#8A5BC4', '#E8DCC6', '#C8643B'][Math.floor(r() * 7)]} />); x += bw + 1 + (r() > 0.85 ? 8 : 0) }
        } else {
          for (let k = 0; k < 5; k++) out.push(<image key={`l${row}-${k}`} href={itemSrc(['bread', 'croissant', 'cookie', 'doughnut', 'cupcake'][(k + row) % 5])} x={14 + k * 34} y={y + 6} width="26" height="26" />)
        }
      }
      return done()
    } else if (detail === 'fame') {
      const prizes = (extras.fame || []).slice(0, 12)
      for (let row = 0; row < 2; row++) out.push(<rect key={'fs' + row} x={10} y={-92 + row * 46} width={WL - 20} height={5} fill="#C9A227" />)
      prizes.slice(0, 12).forEach((p, k) => { const row = Math.floor(k / 6), x = 14 + (k % 6) * 29; out.push(<image key={'p' + k} href={p.prize.startsWith('a:') ? urlFor && urlFor(p.prize.slice(2)) : itemSrc(p.prize)} x={x} y={-92 + row * 46 - 26} width="26" height="26"><title>{p.title}</title></image>) })
      if (!prizes.length) out.push(<text key="none" x={18} y={-60} className="plaque-t" fill="#F2C14E">Trophies land here</text>)
      return done()
    } else if (detail === 'lab') {
      out.push(<g key="ptable"><rect x={20} y={-118} width={120} height={66} fill="#FFFFFF" stroke="#2F5FA8" strokeWidth="3" />
        {Array.from({ length: 36 }, (_, k) => { const c = k % 9, rr = Math.floor(k / 9); if (rr === 0 && c > 0 && c < 8) return null; return <rect key={k} x={26 + c * 12} y={-112 + rr * 13} width="10" height="11" fill={['#F4A3B8', '#F6D58E', '#9FD3C7', '#BFD7F2', '#D5C3F2'][(c + rr) % 5]} /> })}</g>)
    } else if (detail === 'music') {
      out.push(<g key="staff"><rect x={16} y={-120} width={150} height={60} fill="#FFF8EE" />{[0, 1, 2, 3, 4].map((k) => <line key={k} x1={24} y1={-108 + k * 9} x2={158} y2={-108 + k * 9} stroke="#2B2019" strokeWidth="1" />)}{['♪', '♫', '♩', '♬', '♪'].map((n, k) => <text key={k} x={36 + k * 26} y={-82 - (k % 3) * 9} className="note-s">{n}</text>)}</g>)
    } else if (detail === 'chapel') {
      out.push(<g key="cross"><rect x={86} y={-128} width={10} height={70} fill="#C9A227" /><rect x={70} y={-112} width={42} height={10} fill="#C9A227" /></g>)
    } else if (detail === 'menu') {
      out.push(<g key="menu"><Board x={24} y={-120} w={130} h={70} fill="#2B2B2B" frame="#C8643B" /><text x={36} y={-100} className="chalk chalk-h">Menu</text><text x={36} y={-84} className="chalk">{menuFor(extras.today || '2026-01-01')}</text><text x={36} y={-70} className="chalk">Fruit · Milk · Smiles</text></g>)
    } else if (detail === 'theater' || detail === 'stars' || detail === 'paws' || detail === 'neon' || detail === 'code' || detail === 'art' || detail === 'pool' || detail === 'gym') {
      // these rooms draw their patterns on both walls, below
    } else {
      out.push(<g key="posters">{[0, 1].map((k) => <rect key={k} x={30 + k * 70} y={-110 + k * 8} width="40" height="52" fill={['#F6D58E', '#BFE3F2', '#F9C2D1'][Math.floor(r() * 3)]} stroke="#FFF" strokeWidth="3" />)}</g>)
    }
  } else {
    // The right wall: a window onto the real sky, or the room's own
    if (detail === 'chapel') {
      ;(night ? out : lit).push(<g key="glass"><path d={`M70 -40 V-100 a26 26 0 0 1 52 0 V-40 Z`} fill="#F6D58E" stroke="#5C3B22" strokeWidth="4" />
        {Array.from({ length: 8 }, (_, k) => <path key={k} d={`M96 -74 L${96 + Math.cos(Math.PI + (k * Math.PI) / 7) * 30} ${-74 + Math.sin(Math.PI + (k * Math.PI) / 7) * 30}`} stroke="#5C3B22" strokeWidth="2" />)}
        {Array.from({ length: 7 }, (_, k) => <path key={'c' + k} d={`M96 -74 L${96 + Math.cos(Math.PI + (k * Math.PI) / 7) * 28} ${-74 + Math.sin(Math.PI + (k * Math.PI) / 7) * 28} A28 28 0 0 1 ${96 + Math.cos(Math.PI + ((k + 1) * Math.PI) / 7) * 28} ${-74 + Math.sin(Math.PI + ((k + 1) * Math.PI) / 7) * 28} Z`} fill={['#B3263A', '#2F5FA8', '#E0A320', '#3E7A4C', '#8A5BC4', '#E8546B', '#3BA3A8'][k]} opacity=".85" />)}
        <rect x="70" y="-74" width="52" height="34" fill="#2F5FA8" opacity=".7" /><path d="M70 -57 H122 M96 -74 V-40" stroke="#5C3B22" strokeWidth="2" /></g>)
    } else if (detail === 'stars') {
      lit.push(<g key="dome"><clipPath id={`${id}-dome`}><circle cx={96} cy={-86} r={32} /></clipPath><circle cx={96} cy={-86} r={34} fill={`url(#${id}-sky)`} stroke="#C9A227" strokeWidth="5" /><circle cx={96} cy={-86} r={34} fill="#120F22" opacity={night ? 0 : 0.55} />
        {a.dark && <g clipPath={`url(#${id}-dome)`}><line className="ac-meteor" x1={118} y1={-112} x2={108} y2={-106} stroke="#FFF6D6" strokeWidth="1.4" strokeLinecap="round" /></g>}
        <g transform={`translate(96 -86) ${a.moon.waning ? 'scale(-1 1)' : ''}`}><circle r="14" fill="#2E2A4A" /><path d={moonLitPath(a.moon.fraction, 14)} fill="#F4EBD0" /></g></g>)
    } else if (detail === 'gym') {
      out.push(<g key="hoop"><rect x={70} y={-138} width={52} height={36} fill="#FFFFFF" stroke="#C8643B" strokeWidth="3" /><rect x={86} y={-124} width={20} height={14} fill="none" stroke="#C8643B" strokeWidth="2" /><ellipse cx={96} cy={-100} rx={13} ry={4} fill="none" stroke="#E0662F" strokeWidth="3" />{[-9, -3, 3, 9].map((d) => <line key={d} x1={96 + d} y1={-98} x2={96 + d * 0.6} y2={-84} stroke="#FFF" strokeWidth="1.2" />)}</g>)
    } else if (detail === 'pool') {
      // tiled walls only
    } else if (!['theater'].includes(detail)) {
      lit.push(<Window key="win" {...WIN} id={id} frame={light(wall) ? '#FFFFFF' : '#FFF8EE'} a={a} />)
      if (detail === 'tasks') out.push(<g key="abc">{'ABCDEFGHIJ'.split('').map((c, k) => <text key={c} x={10 + k * 18} y={-H + 18} className="abc" fill={['#B3263A', '#2F5FA8', '#E0A320', '#3E7A4C', '#8A5BC4'][k % 5]}>{c}{c.toLowerCase()}</text>)}</g>)
      if (detail === 'fame') {
        ;(extras.fame || []).filter((p) => p.kind === 'cheer').slice(0, 2).forEach((p, k) => out.push(<g key={'pl' + k}><rect x={124} y={-128 + k * 46} width={60} height={38} fill="#C9A227" /><rect x={127} y={-125 + k * 46} width={54} height={32} fill="#2B2019" /><text x={131} y={-112 + k * 46} className="plaque-t">{trunc(p.title, 12)}</text><text x={131} y={-101 + k * 46} className="plaque-s">{p.on}</text></g>))
      }
    }
  }
  // Patterns over a whole wall, either side
  if (detail === 'theater') {
    for (let k = 0; k < 8; k++) out.push(<rect key={'cu' + k} x={k * 24} y={-H + 6} width="24" height={H - 14} fill={k % 2 ? '#9C2333' : '#7A1A28'} />)
    out.push(<path key="val" d={`M0 ${-H + 6} H${WL} V${-H + 26} Q${WL - 24} ${-H + 40} ${WL - 48} ${-H + 26} T${WL - 96} ${-H + 26} T${WL - 144} ${-H + 26} T0 ${-H + 26} Z`} fill="#C9A227" opacity=".9" />)
  }
  if (detail === 'stars') for (let k = 0; k < 26; k++) lit.push(<circle key={'st' + k} cx={r() * WL} cy={-H + 10 + r() * (H - 30)} r={0.6 + r() * 1.4} fill="#FFF6D6" opacity={0.5 + r() * 0.5} className={k % 4 ? undefined : 'ac-twinkle'} />)
  if (detail === 'paws') for (let k = 0; k < 14; k++) { const x = 12 + (k % 5) * 38 + (Math.floor(k / 5) % 2) * 18, y = -128 + Math.floor(k / 5) * 40; if (!L && x > 40 && x < 120 && y < -40) continue; out.push(<g key={'pw' + k} fill={shade(wall, -0.18)}><ellipse cx={x} cy={y + 6} rx="5" ry="4" />{[-5, -2, 2, 5].map((d) => <circle key={d} cx={x + d} cy={y - (Math.abs(d) > 3 ? 0 : 2)} r="1.8" />)}</g>) }
  if (detail === 'neon') lit.push(<g key="neon" fill="none" strokeLinecap="round" className="ac-neon" style={{ animationDelay: L ? '0s' : '-2.3s' }}>{[['#FF5FA2', -120], ['#4CE0F0', -110], ['#F7E26B', -100]].map(([c, y]) => <g key={c}><path d={`M10 ${y} Q${WL / 2} ${y - 18} ${WL - 10} ${y}`} stroke={c} strokeWidth={night ? 9 : 6} opacity={night ? 0.34 : 0.25} /><path d={`M10 ${y} Q${WL / 2} ${y - 18} ${WL - 10} ${y}`} stroke={c} strokeWidth="2" /></g>)}</g>)
  if (detail === 'lights') lit.push(<g key="lights">{Array.from({ length: 11 }, (_, k) => { const x = 8 + k * 17, y = -H + 18 + Math.sin((k / 10) * Math.PI) * 12; return <g key={k}><circle cx={x} cy={y} r={night ? 8 : 5} fill={['#F7E26B', '#FF9DBB', '#9FE3F0', '#B6F09F'][k % 4]} opacity={night ? 0.42 : 0.35} /><circle cx={x} cy={y} r="2.4" fill={['#F7E26B', '#FF9DBB', '#9FE3F0', '#B6F09F'][k % 4]} className={k % 3 ? undefined : 'ac-twinkle'} /></g> })}<path d={`M0 ${-H + 16} Q${WL / 2} ${-H + 34} ${WL} ${-H + 16}`} fill="none" stroke="#3B2B22" strokeWidth=".8" /></g>)
  if (detail === 'code' && L) lit.push(<g key="code"><rect x={20} y={-118} width={120} height={70} fill="#1E2233" /><rect className="ac-blink" x={30} y={-55} width="5" height="4" fill="#F8F8F2" />{Array.from({ length: 7 }, (_, k) => <rect key={k} x={28 + (k % 3) * 8} y={-110 + k * 9} width={30 + r() * 60} height="4" fill={['#FF79C6', '#8BE9FD', '#50FA7B', '#F1FA8C', '#BD93F9'][k % 5]} />)}</g>)
  if (detail === 'art') for (let k = 0; k < (L ? 3 : 1); k++) { const x = L ? 18 + k * 56 : 130, y = L ? -116 + (k % 2) * 10 : -116; out.push(<g key={'art' + k}><rect x={x} y={y} width="44" height="54" fill="#FFF8EE" stroke="#5C3B22" strokeWidth="3" />{Array.from({ length: 4 }, (_, q) => <circle key={q} cx={x + 8 + r() * 28} cy={y + 8 + r() * 38} r={4 + r() * 9} fill={['#E8546B', '#F2C14E', '#4A7FD6', '#5FA85A', '#8A5BC4'][Math.floor(r() * 5)]} opacity=".85" />)}</g>) }
  if (detail === 'pool') out.push(<g key="tiles" stroke="#FFFFFF" strokeOpacity=".8">{Array.from({ length: 12 }, (_, k) => <line key={'v' + k} x1={k * 16} y1={-H} x2={k * 16} y2="0" />)}{Array.from({ length: 9 }, (_, k) => <line key={'h' + k} x1="0" y1={-k * 16} x2={WL} y2={-k * 16} />)}</g>)
  if (detail === 'pool') lit.push(<g key="ripples" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".42">{[0, 1, 2, 3].map((k) => <path key={k} className="ac-caustic" d={`M${12 + k * 44} ${-34 - (k % 2) * 30}q7 -6 14 0t14 0t14 0`} style={{ animationDelay: `${-k * 1.1}s` }} />)}</g>)
  if (L && !['fame', 'shelves', 'bakery', 'theater'].includes(detail)) out.push(<Clock key="clock" x={176} y={-128} now={now} rim={light(wall) ? '#3B2B22' : '#2B2019'} />)
  return done()
}
