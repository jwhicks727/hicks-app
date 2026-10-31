import SunCalc from 'suncalc'
import { pt, mid, tile, floorShapes, byDepth, TW, TH } from './iso.js'
import { ROOM_KINDS } from './rooms.js'
import { itemSrc } from './items.js'
import { shade } from './RoomScene.jsx'
import { HOME_TOWN, SKIES, phaseOf } from '../lib/sky.js'

// The campus: a lawn with a little building on each room's square, her
// school's flag at the back, trees where nothing's been built, and above it
// all a star for every task she's finished this month. Tap a building to go
// in; in arranging, tap one and move it with the arrows.

const BH = 34 // a building's height

export default function Campus({ rooms, n, colours = [], stars = 0, newStars = 0, arranging = false, selected, onOpen, onSelect, name, now = new Date() }) {
  const t = SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng)
  const sky = SKIES[phaseOf(now, t)]
  const w = n * TW, top = -BH - 104, h = n * TH - top + 30
  const used = new Set(rooms.map((r) => `${r.cx},${r.cy}`))
  const f = floorShapes(n, 16)
  const [dark, green, gold] = [colours[0] || '#1C2B22', colours[1] || '#3FA34D', colours[2] || '#F2C14E']
  // Trees and flowers where nothing's built, the same every time
  const scenery = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (used.has(`${i},${j}`)) continue
    const v = (i * 7 + j * 13 + n) % 11
    if (v === 1 || v === 6) scenery.push({ i, j, k: (i + j) % 3 ? 'deciduous-tree' : 'evergreen-tree', s: 30 })
    else if (v === 3) scenery.push({ i, j, k: ['sunflower', 'tulip', 'cherry-blossom', 'mushroom'][(i + j) % 4], s: 20 })
  }
  const things = [...rooms.map((r) => ({ ...r, i: r.cx, j: r.cy, room: true })), ...(arranging ? [] : scenery)].sort(byDepth)
  const starPts = Array.from({ length: Math.min(stars, 120) }, (_, k) => { const a = Math.sin(k * 12.9898) * 43758.5453, b = Math.sin(k * 78.233) * 12345.678; return { x: -w / 2 + (a - Math.floor(a)) * w, y: top + 6 + (b - Math.floor(b)) * 84 } })
  return (
    <svg className={'campus-svg' + (arranging ? ' arranging' : '')} viewBox={`${-w / 2 - 12} ${top} ${w + 24} ${h}`} role="img" aria-label={`${name}: ${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'}, and ${stars} ${stars === 1 ? 'star' : 'stars'} this month`}>
      <defs>
        <linearGradient id="campus-sky" x1="0" y1="0" x2="0" y2="1">{sky.g.map((c, k) => <stop key={k} offset={k / (sky.g.length - 1)} stopColor={c} />)}</linearGradient>
        <radialGradient id="star-glow"><stop offset="0" stopColor="#FFF6C8" stopOpacity=".9" /><stop offset="1" stopColor="#FFF6C8" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x={-w / 2 - 12} y={top} width={w + 24} height={h} fill="url(#campus-sky)" rx="6" />
      {/* Her stars: a task done, a star */}
      {starPts.map((p, k) => (
        <g key={k} transform={`translate(${p.x} ${p.y})`} className={k >= stars - newStars ? 'star new' : 'star'}>
          <circle r="7" fill="url(#star-glow)" />
          <path d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3 Z" fill="#FFE27A" />
        </g>
      ))}
      {/* The grounds */}
      <polygon points={f.left} fill="#5A3E2B" />
      <polygon points={f.right} fill="#6E4B33" />
      <polygon points={f.top} fill="#7DB85A" />
      {Array.from({ length: n * n }, (_, k) => { const i = k % n, j = Math.floor(k / n); return (i + j) % 2 ? <polygon key={k} points={tile(i, j)} fill="#70AC4F" /> : null })}
      {arranging && Array.from({ length: n * n }, (_, k) => <polygon key={'g' + k} points={tile(k % n, Math.floor(k / n), 0.04)} className="room-grid" />)}
      {/* The flag at the back */}
      <g>
        <line x1="0" y1="2" x2="0" y2="-92" stroke="#D8D2C8" strokeWidth="3" />
        <path d="M2 -90 h34 l-8 9 l8 9 h-34 Z" fill={green} stroke={dark} strokeWidth="1.5" className="ac-flag" />
        <rect x="2" y="-80" width="34" height="3" fill={gold} className="ac-flag" />
      </g>
      {things.map((x) => (x.room ? <Building key={x.id} r={x} picked={selected === x.id} arranging={arranging} roof={dark} trim={gold} onTap={() => (arranging ? onSelect(x.id) : onOpen(x.id))} /> : (
        <image key={`s${x.i}-${x.j}`} href={itemSrc(x.k)} x={mid(x.i, x.j).x - x.s / 2} y={mid(x.i, x.j).y - x.s * 0.9} width={x.s} height={x.s} pointerEvents="none" />
      )))}
    </svg>
  )
}

/** A little building: two walls in its room's colour, a roof in the school's, its sign above. */
function Building({ r, picked, arranging, roof, trim, onTap }) {
  const k = ROOM_KINDS[r.kind] || ROOM_KINDS.classroom
  const wall = (r.style && r.style.wall) || k.wall
  const base = wall === 'glass' ? '#BFE3EC' : wall === 'none' ? '#7DB85A' : wall
  const i = r.cx, j = r.cy, ins = 0.12
  const A = pt(i + ins, j + ins), B = pt(i + 1 - ins, j + ins), C = pt(i + 1 - ins, j + 1 - ins), D = pt(i + ins, j + 1 - ins)
  const up = (p, h = BH) => `${p.x},${p.y - h}`
  const open = r.kind === 'courtyard'
  const m = mid(i, j)
  return (
    <g className={'building' + (picked ? ' picked' : '')} onClick={(e) => { e.stopPropagation(); onTap() }} role="button" tabIndex={0} aria-label={arranging ? `Pick ${r.name} to move it` : `Go into ${r.name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}>
      <title>{r.name}</title>
      <ellipse cx={m.x} cy={m.y + 4} rx="26" ry="10" fill="rgba(20, 30, 10, .22)" />
      {open ? (
        <>
          <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`} fill="#9CCB7A" stroke="#E8DCC0" strokeWidth="3" />
          <image href={itemSrc(k.sign)} x={m.x - 15} y={m.y - 26} width="30" height="30" />
        </>
      ) : (
        <>
          <polygon points={`${D.x},${D.y} ${C.x},${C.y} ${up(C)} ${up(D)}`} fill={shade(base, -0.18)} />
          <polygon points={`${C.x},${C.y} ${B.x},${B.y} ${up(B)} ${up(C)}`} fill={shade(base, 0.08)} />
          {/* windows and a door */}
          <polygon points={`${D.x + 6},${D.y - 1 - 18} ${D.x + 14},${D.y - 5 - 18} ${D.x + 14},${D.y - 5 - 8} ${D.x + 6},${D.y - 1 - 8}`} fill="#FFE9A8" opacity=".9" />
          <polygon points={`${C.x + 5},${C.y - 3} ${C.x + 13},${C.y - 7} ${C.x + 13},${C.y - 7 - 16} ${C.x + 5},${C.y - 3 - 16}`} fill={shade(base, -0.45)} />
          <polygon points={`${C.x + 16},${C.y - 8 - 18} ${C.x + 22},${C.y - 11 - 18} ${C.x + 22},${C.y - 11 - 9} ${C.x + 16},${C.y - 8 - 9}`} fill="#FFE9A8" opacity=".9" />
          {/* the roof */}
          <polygon points={`${up(A, BH)} ${up(B, BH)} ${up(C, BH)} ${up(D, BH)}`} fill={roof} />
          <polygon points={`${up(A, BH + 3)} ${up(B, BH + 3)} ${up(C, BH + 3)} ${up(D, BH + 3)}`} fill={shade(roof, 0.18)} />
          <polyline points={`${up(D, BH)} ${up(C, BH)} ${up(B, BH)}`} fill="none" stroke={trim} strokeWidth="2" />
          <g className="sign"><image href={itemSrc(k.sign)} x={m.x - 15} y={m.y - BH - 40} width="30" height="30" /></g>
        </>
      )}
      {picked && <polygon points={tile(i, j, 0.02)} className="room-picked" />}
    </g>
  )
}
