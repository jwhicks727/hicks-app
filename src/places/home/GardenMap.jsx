import { useRef, useState } from 'react'
import { SPOT_KINDS } from '../../lib/garden.js'

// An area of the garden, drawn: a lawn, a patio or a room's floor, and on it
// every bed, box, pot, tree, feeder and bath in its own colours. Not to scale
// in the details, only in where things are. In edit mode a spot can be
// dragged (desktop or touch: pointer events, the map's own gesture) or
// moved with a tap: choose "Move", then tap where it goes.

const ROSETTE = ['#6BBF59', '#4E9A42', '#86C96B', '#5AAE4C']
const BLOOMS = ['#F2A33A', '#E85D75', '#F4D35E', '#B48CFF']

export default function GardenMap({ area, spots, plants = [], edit = false, selected = null, moving = false, onSelect, onMove, onOpen, className = '' }) {
  const svg = useRef(null)
  const W = 100, H = Math.max(30, Math.min(200, (100 * Number(area.depth_ft)) / Number(area.width_ft)))
  const [drag, setDrag] = useState(null) // { id, dx, dy, x, y, moved }
  const toMap = (e) => {
    const pt = svg.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse())
    return { x: (p.x / W) * 100, y: (p.y / H) * 100 }
  }
  const pos = (s) => (drag && drag.id === s.id ? { ...s, x: drag.x, y: drag.y } : s)

  const down = (e, s) => {
    if (!edit) return
    e.stopPropagation()
    const p = toMap(e)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ id: s.id, dx: p.x - s.x, dy: p.y - s.y, x: s.x, y: s.y, moved: false })
    onSelect && onSelect(s.id)
  }
  const move = (e) => {
    if (!drag) return
    const p = toMap(e), s = spots.find((x) => x.id === drag.id)
    const x = Math.min(100 - s.w, Math.max(0, p.x - drag.dx)), y = Math.min(100 - s.h, Math.max(0, p.y - drag.dy))
    setDrag({ ...drag, x, y, moved: drag.moved || Math.abs(x - s.x) + Math.abs(y - s.y) > 0.8 })
  }
  const up = () => {
    if (!drag) return
    if (drag.moved) onMove && onMove(drag.id, { x: Math.round(drag.x * 10) / 10, y: Math.round(drag.y * 10) / 10 })
    setDrag(null)
  }
  // A tap on the ground: move the chosen spot there, or let go of it
  const tapGround = (e) => {
    if (!edit) return
    if (moving && selected) {
      const s = spots.find((x) => x.id === selected), p = toMap(e)
      onMove && onMove(s.id, { x: Math.round(Math.min(100 - s.w, Math.max(0, p.x - s.w / 2)) * 10) / 10, y: Math.round(Math.min(100 - s.h, Math.max(0, p.y - s.h / 2)) * 10) / 10 })
    } else onSelect && onSelect(null)
  }
  const plantsIn = (id) => plants.filter((p) => p.spot_id === id && p.status !== 'done')

  return (
    <svg ref={svg} className={'gmap' + (edit ? ' edit' : '') + (moving ? ' moving' : '') + ' ' + className} viewBox={`0 0 ${W} ${H.toFixed(2)}`} role="img" aria-label={`${area.name}, drawn`}
      onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)} onClick={tapGround}>
      <defs>
        <linearGradient id="g-lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9BD072" /><stop offset="1" stopColor="#6FAE55" /></linearGradient>
        <pattern id="g-mow" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="4" height="8" fill="#FFFFFF" opacity=".07" /></pattern>
        <linearGradient id="g-floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F1D9B3" /><stop offset="1" stopColor="#DDBA88" /></linearGradient>
        <pattern id="g-planks" width="100" height="5" patternUnits="userSpaceOnUse"><rect width="100" height="5" fill="none" /><path d="M0 5H100" stroke="#B8915E" strokeWidth=".18" opacity=".6" /><path d="M23 0V5M71 2.5V5" stroke="#B8915E" strokeWidth=".15" opacity=".5" /></pattern>
        <radialGradient id="g-window" cx=".5" cy="0" r=".8"><stop offset="0" stopColor="#FFF4C8" stopOpacity=".95" /><stop offset="1" stopColor="#FFF4C8" stopOpacity="0" /></radialGradient>
        <linearGradient id="g-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8A5A36" /><stop offset="1" stopColor="#6B4428" /></linearGradient>
        <radialGradient id="g-terra" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#E28A5E" /><stop offset="1" stopColor="#B2532F" /></radialGradient>
        <radialGradient id="g-canopy" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#7CC062" /><stop offset="1" stopColor="#3E7A34" /></radialGradient>
        <radialGradient id="g-water" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#BFE8F2" /><stop offset="1" stopColor="#5AAFC9" /></radialGradient>
      </defs>
      {area.indoor ? (
        <>
          <rect width={W} height={H} fill="url(#g-floor)" />
          <rect width={W} height={H} fill="url(#g-planks)" />
          <rect width={W} height={H * 0.6} fill="url(#g-window)" />
          <rect x="30" y="0" width="40" height="1.6" fill="#9FD3F0" stroke="#FFFFFF" strokeWidth=".4" />
        </>
      ) : (
        <>
          <rect width={W} height={H} fill="url(#g-lawn)" />
          <rect width={W} height={H} fill="url(#g-mow)" />
        </>
      )}
      {spots.map((s0) => {
        const s = pos(s0), k = SPOT_KINDS[s.kind] || SPOT_KINDS.other
        const x = s.x, y = (s.y / 100) * H, w = s.w, h = (s.h / 100) * H, cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2
        const green = plantsIn(s.id)
        const sel = selected === s.id
        const open = (e) => { if (edit) return; e.stopPropagation(); onOpen && onOpen(s.id) }
        let body
        if (k.shape === 'round') {
          if (s.kind === 'tree') body = <><ellipse cx={cx + r * 0.2} cy={cy + r * 0.25} rx={r} ry={r * 0.85} fill="#000" opacity=".12" /><circle cx={cx} cy={cy} r={r} fill="url(#g-canopy)" /><circle cx={cx - r * 0.35} cy={cy - r * 0.3} r={r * 0.35} fill="#9AD27B" opacity=".5" /></>
          else if (s.kind === 'bath') body = <><circle cx={cx} cy={cy} r={r} fill="#D8CFC0" stroke="#A89A84" strokeWidth=".3" /><circle cx={cx} cy={cy} r={r * 0.72} fill="url(#g-water)" /><path d={`M${cx - r * 0.3} ${cy - r * 0.1}q${r * 0.15} -${r * 0.12} ${r * 0.3} 0`} stroke="#FFF" strokeWidth=".25" fill="none" /></>
          else if (s.kind === 'feeder') body = <><circle cx={cx} cy={cy} r={r} fill="#D9463A" stroke="#8E2A22" strokeWidth=".3" />{[0, 1, 2, 3, 4].map((i) => { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; return <circle key={i} cx={cx + Math.cos(a) * r * 0.62} cy={cy + Math.sin(a) * r * 0.62} r={r * 0.17} fill="#FFE07A" /> })}</>
          else body = <><circle cx={cx} cy={cy} r={r} fill={s.kind === 'pot' ? 'url(#g-terra)' : '#4E9A42'} />{s.kind === 'pot' && <circle cx={cx} cy={cy} r={r * 0.78} fill="#5B3A22" />}<circle cx={cx} cy={cy} r={r * (s.kind === 'pot' ? 0.6 : 0.9)} fill={green.length || s.kind === 'plant' ? '#6BBF59' : '#7A5638'} />{(green.length > 0 || s.kind === 'plant') && <circle cx={cx - r * 0.2} cy={cy - r * 0.2} r={r * 0.28} fill="#9AD27B" />}</>
        } else {
          const rows = []
          if (s.kind === 'bed' || s.kind === 'box') {
            const n = Math.max(1, Math.min(10, Math.floor(w / 3.4))), m = Math.max(1, Math.min(6, Math.floor(h / 3.4)))
            for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
              const px = x + ((i + 0.5) * w) / n, py = y + ((j + 0.5) * h) / m, idx = i * 7 + j * 3
              rows.push(green.length ? <g key={`${i}-${j}`}><circle cx={px} cy={py} r={Math.min(w / n, h / m) * 0.36} fill={ROSETTE[idx % ROSETTE.length]} />{idx % 5 === 0 && <circle cx={px + 0.5} cy={py - 0.4} r=".45" fill={BLOOMS[idx % BLOOMS.length]} />}</g> : <circle key={`${i}-${j}`} cx={px} cy={py} r=".3" fill="#4D3220" />)
            }
          }
          body = (
            <>
              <rect x={x} y={y} width={w} height={h} rx={s.kind === 'path' ? h / 2 : 1.2} fill={s.kind === 'bed' || s.kind === 'box' ? 'url(#g-soil)' : k.colour} stroke={s.kind === 'box' ? '#C08A55' : 'none'} strokeWidth={s.kind === 'box' ? 1 : 0} />
              {rows}
              {s.kind === 'compost' && [0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={x + w * ((i * 37) % 100) / 100} cy={y + h * ((i * 61) % 100) / 100} r=".35" fill="#8C6A47" />)}
            </>
          )
        }
        return (
          <g key={s.id} className={'gspot' + (sel ? ' sel' : '')} onPointerDown={(e) => down(e, s0)} onClick={open} style={{ cursor: edit ? 'grab' : 'pointer' }}>
            {body}
            {sel && <rect x={x - 0.8} y={y - 0.8} width={w + 1.6} height={h + 1.6} rx="1.6" fill="none" stroke="#FFFFFF" strokeWidth=".5" strokeDasharray="1.4 1" />}
            <text x={cx} y={k.shape === 'round' ? y + h + 3 : cy + 1} className="gspot-name" textAnchor="middle">{s.name}</text>
          </g>
        )
      })}
    </svg>
  )
}
