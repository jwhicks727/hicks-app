import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useNow } from '../../lib/useNow.js'
import { reducedMotion } from '../../lib/motion.js'
import { PLACES, STOPS, STOP_ORDER, RANGES, PEAKS, LAKES, pinsAt, fitCamera, viewBoxFor, toScreen, project, nearWeight, tween, layoutLabels, peakGlyphs, nightPath, milesBetween } from '../../lib/places.js'
import { HOME_TOWN } from '../../lib/sky.js'

// All our places on one map, at three sizes: around home, Southern
// California, the world. Each place is a pin with its name in a band above
// or below the map, a tap from its own page; a group of places too close to
// tell apart is one pin that zooms in. Zooming flies between the sizes.
// Outlines: Natural Earth (public domain), loaded only when the map is.

const KEY = 'teamhicks.mapstop'
const timeIn = (tz, now) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(now)
const hourIn = (tz, now) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
const FAN = [[0, 0], [-12, 10], [12, 10], [0, 18]] // places in one town, round its centre (px)
const SIDE = 18

export default function PlacesMap() {
  const now = useNow()
  const [stop, setStopState] = useState(() => { try { return sessionStorage.getItem(KEY) || 'world' } catch { return 'world' } })
  const setStop = (s) => { setStopState(s); try { sessionStorage.setItem(KEY, s) } catch { /* fine */ } }
  const [data, setData] = useState(null)
  useEffect(() => { let live = true; import('../../lib/mapdata.js').then((m) => live && setData(m)); return () => { live = false } }, [])

  // The frame's size, and each label's, measured as drawn (text size and all)
  const frame = useRef(null), chips = useRef({})
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const el = frame.current
    const read = () => setSize((s) => (s && s.W === el.clientWidth && s.H === el.clientHeight ? s : { W: el.clientWidth, H: el.clientHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Measured again whenever a label changes size: the web font arriving, the text size, the time
  const [dims, setDims] = useState({ w: {}, h: 32 })
  const measure = () => {
    const w = {}
    let h = 0
    for (const [id, el] of Object.entries(chips.current)) if (el) { w[id] = el.offsetWidth; h = Math.max(h, el.offsetHeight) }
    if (h) setDims((d) => (h !== d.h || Object.keys(w).some((k) => w[k] !== d.w[k]) ? { w, h } : d))
  }
  useLayoutEffect(measure)
  useEffect(() => {
    const ro = new ResizeObserver(measure)
    for (const el of Object.values(chips.current)) if (el) ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rowH = dims.h + 6
  const rowsAt = (s) => {
    if (!size) return 1
    const total = pinsAt(s).reduce((t, p) => t + (dims.w[p.slug] || 90) + 6, 0)
    return total > 1.8 * (size.W - 2 * 8) ? 2 : 1
  }
  const bandsAt = (s) => rowsAt(s) * rowH + 8
  const target = data && size ? fitCamera(stop, size.W, size.H, bandsAt(stop), SIDE, data.NEAR) : null

  // Fly from where the camera is to the stop's view
  const [cam, setCam] = useState(null), [moving, setMoving] = useState(false)
  const camRef = useRef(null), raf = useRef(0)
  const targetKey = target ? `${stop}|${target.lng.toFixed(4)}|${target.lat.toFixed(4)}|${target.span.toFixed(4)}` : ''
  useEffect(() => {
    if (!target) return
    cancelAnimationFrame(raf.current)
    const from = camRef.current
    const jump = !from || reducedMotion() || (Math.abs(from.span - target.span) / target.span < 0.02 && Math.abs(from.lng - target.lng) < 0.01)
    if (jump) { camRef.current = target; setCam(target); setMoving(false); return }
    const long = Math.abs(Math.log(from.span / target.span)) > 1.5, ms = long ? 1100 : 650, t0 = performance.now()
    setMoving(true)
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), c = tween(from, target, k)
      camRef.current = c
      setCam(c)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else setMoving(false)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [targetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const pins = useMemo(() => pinsAt(stop), [stop])
  const ready = cam && size && data
  const w = ready ? nearWeight(cam.span) : 0

  // Where each pin lands: between the two layers' positions while they cross-fade
  const spots = {}
  if (ready) {
    const { W, H } = size, towns = {}
    for (const p of pins) {
      const a = toScreen('world', cam, W, H, data.NEAR, p.lat, p.lng), b = toScreen('near', cam, W, H, data.NEAR, p.lat, p.lng)
      let x = a[0] + (b[0] - a[0]) * w, y = a[1] + (b[1] - a[1]) * w
      // Places sharing one spot (home and a school both at the town's centre) fan out round it
      const spot = `${p.lat},${p.lng}`
      if (p.kind === 'place' && stop === 'home') { const n = (towns[spot] = (towns[spot] || 0) + 1) - 1; if (n) { x += FAN[n][0]; y += FAN[n][1] } }
      spots[p.slug] = { x, y }
    }
  }
  // Mountains as rows of little peaks, kept clear of the pins and the lakes
  let peaks = [], rangeNames = [], bigPeaks = [], g = 1
  if (ready && w > 0.05) {
    const { W, H } = size, at = (lng, lat) => toScreen('near', cam, W, H, data.NEAR, lat, lng)
    const avoid = [...Object.values(spots).map((s) => [s.x, s.y, 11]), ...LAKES.map((l) => { const [x, y] = at(l.lng, l.lat); return [x, y, 8] })]
    // Zoomed in further (a wide screen), the peaks grow rather than crowd
    g = Math.min(2.6, Math.max(1, W / (cam.span * 92.6) / 3.2))
    bigPeaks = PEAKS.map((pk) => ({ ...pk, xy: at(pk.lng, pk.lat) }))
    peaks = peakGlyphs(RANGES.map((r) => r.poly.map(([lng, lat]) => at(lng, lat))), [...avoid, ...bigPeaks.map((b) => [b.xy[0], b.xy[1], 12 * g])], W, H, 13 * g)
    if (stop !== 'world' && !moving) {
      // Each range's name where it fits: inside the map, clear of the bands, the pins and each other
      const band = bandsAt(stop), boxes = []
      for (const r of RANGES) {
        const name = stop === 'home' ? r.name : r.name.replace('Mountains', 'Mts'), [x, y] = at(...r.label), half = (name.length * 7.4) / 2
        const box = [x - half, y - 9, x + half, y + 3]
        const clear = box[0] > 4 && box[2] < W - 4 && box[1] > band && box[3] < H - band &&
          !boxes.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3]) &&
          !Object.values(spots).some((s) => s.x > box[0] - 6 && s.x < box[2] + 6 && s.y > box[1] - 6 && s.y < box[3] + 6)
        if (clear) { boxes.push(box); rangeNames.push({ name, xy: [x, y] }) }
      }
    }
  }
  const winter = (() => { const m = now.getMonth() + 1; return m === 12 || m <= 4 })()
  const labels = ready && !moving ? layoutLabels(pins.map((p) => ({ id: p.slug, x: spots[p.slug].x, y: spots[p.slug].y, w: dims.w[p.slug] || 90 })), { W: size.W, H: size.H, rows: rowsAt(stop), rowH }) : {}
  const home = spots['group-socal'] || spots.home

  const allChips = useMemo(() => {
    const seen = new Set(), out = []
    for (const s of STOP_ORDER) for (const p of pinsAt(s)) if (!seen.has(p.slug)) { seen.add(p.slug); out.push(p) }
    return out
  }, [])

  return (
    <Card className="span-6 pmap-card" tint="#3BA3A8" label="Our places" glyph="star">
      <div className="pm-seg" role="group" aria-label="How far to look" style={{ '--i': STOP_ORDER.indexOf(stop) }}>
        <span className="pm-seg-pill" aria-hidden="true" />
        {STOP_ORDER.map((s) => <button key={s} type="button" aria-pressed={s === stop} onClick={() => setStop(s)}>{STOPS[s].name}</button>)}
      </div>
      <div className={'pmap' + (moving ? ' moving' : '') + (ready ? ' ready' : '')} ref={frame} data-stop={stop}>
        {ready && (
          <>
            <svg className="pm-layer" viewBox={viewBoxFor('world', cam, size.W, size.H, data.NEAR).join(' ')} preserveAspectRatio="none" style={{ opacity: 1 - w }} aria-hidden="true">
              <defs>
                <linearGradient id="pm-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="pm-sea-a" /><stop offset="1" className="pm-sea-b" /></linearGradient>
              </defs>
              <rect x="-1000" y="0" width="3000" height={data.WORLD.height} fill="url(#pm-sea)" />
              <path className="pm-grid" d={[...Array(13)].map((_, i) => `M${(i * 1000) / 12} 0V${data.WORLD.height}`).join('') + [...Array(5)].map((_, i) => `M-1000 ${((84 - (60 - i * 30)) / 360) * 1000}H2000`).join('')} vectorEffect="non-scaling-stroke" />
              <path className="pm-land" d={data.WORLD.land} vectorEffect="non-scaling-stroke" />
              <path className="pm-night" d={nightPath(now)} />
            </svg>
            <svg className="pm-layer" viewBox={viewBoxFor('near', cam, size.W, size.H, data.NEAR).join(' ')} preserveAspectRatio="none" style={{ opacity: w }} aria-hidden="true">
              <rect x="-4000" y="-4000" width="9000" height="9000" fill="url(#pm-sea)" />
              <path className="pm-land" d={data.NEAR.land} vectorEffect="non-scaling-stroke" />
              {LAKES.map((l) => { const [x, y] = project('near', l.lat, l.lng, data.NEAR); return <ellipse key={l.name} className="pm-lake" cx={x} cy={y} rx={l.rx * data.NEAR.cos0 * data.NEAR.k} ry={l.ry * data.NEAR.k} transform={`rotate(${l.tilt} ${x} ${y})`} vectorEffect="non-scaling-stroke" /> })}
            </svg>
            <svg className="pm-over" viewBox={`0 0 ${size.W} ${size.H}`} aria-hidden="true">
              <g className="pm-peaks" style={{ opacity: w }}>
                <path d={peaks.map(([x, y]) => `M${(x - 4.5 * g).toFixed(1)} ${(y + 3 * g).toFixed(1)}L${x.toFixed(1)} ${(y - 3 * g).toFixed(1)}L${(x + 4.5 * g).toFixed(1)} ${(y + 3 * g).toFixed(1)}Z`).join('')} />
                {bigPeaks.map((b) => <path key={b.name} d={`M${b.xy[0] - 8 * g} ${b.xy[1] + 5 * g}L${b.xy[0]} ${b.xy[1] - 6 * g}L${b.xy[0] + 8 * g} ${b.xy[1] + 5 * g}Z`} />)}
                {winter && <path className="pm-snow" d={bigPeaks.map((b) => `M${b.xy[0] - 3.3 * g} ${b.xy[1] - 1.5 * g}L${b.xy[0]} ${b.xy[1] - 6 * g}L${b.xy[0] + 3.3 * g} ${b.xy[1] - 1.5 * g}Z`).join('')} />}
                {rangeNames.map((r) => <text key={r.name} x={r.xy[0]} y={r.xy[1]} className="pm-range">{r.name.toUpperCase()}</text>)}
              </g>
              {stop === 'world' && !moving && home && pins.filter((p) => p.kind === 'place').map((p) => {
                const b = spots[p.slug], dx = b.x - home.x, dy = b.y - home.y, d = Math.hypot(dx, dy)
                return <path key={'arc' + p.slug} className="pm-arc" d={`M${home.x} ${home.y}Q${(home.x + b.x) / 2} ${(home.y + b.y) / 2 - d * 0.28} ${b.x} ${b.y}`} stroke={p.colour} />
              })}
              {pins.map((p) => {
                const s = spots[p.slug], l = labels[p.slug]
                if (!l) return null
                const cx = l.left + (dims.w[p.slug] || 90) / 2, cy = l.side === 'top' ? l.top + dims.h : l.top, my = (s.y + cy) / 2
                return <path key={'lead' + p.slug} className="pm-lead" d={`M${s.x} ${s.y}C${s.x} ${my} ${cx} ${my} ${cx} ${cy}`} />
              })}
              {pins.map((p) => {
                const s = spots[p.slug]
                return (
                  <g key={p.slug} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
                    {(p.home || p.kind === 'group') && <circle r="9" className="pm-pulse" fill={p.colour} />}
                    <circle r={p.kind === 'group' ? 6.5 : 4.6} fill={p.colour} className="pm-dot" />
                  </g>
                )
              })}
            </svg>
          </>
        )}
        {allChips.map((p) => {
          const l = labels[p.slug], on = Boolean(l), night = p.tz && (hourIn(p.tz, now) < 6 || hourIn(p.tz, now) >= 19)
          const body = (
            <>
              <i style={{ background: p.colour }} />
              <b>{p.name}</b>
              {p.kind === 'group' && <small>{p.count} places ›</small>}
              {p.kind === 'place' && p.stop === 'world' && <small className={'fig' + (night ? ' night' : '')}>{timeIn(p.tz, now)}</small>}
            </>
          )
          const props = { key: p.slug, ref: (el) => { chips.current[p.slug] = el }, className: 'pm-chip' + (on ? ' on' : ''), style: on ? { left: l.left, top: l.top } : undefined, tabIndex: on ? undefined : -1, 'aria-hidden': on ? undefined : true }
          return p.kind === 'group'
            ? <button type="button" {...props} onClick={() => setStop(p.to)} aria-label={`${p.name}: zoom in to ${p.count} places`}>{body}</button>
            : <Link to={'/world/place/' + p.slug} {...props}>{body}</Link>
        })}
      </div>
      <PlaceList stop={stop} now={now} onStop={setStop} />
    </Card>
  )
}

/** The same places as a list: this size's own, then the other sizes to zoom to. */
function PlaceList({ stop, now, onStop }) {
  const own = PLACES.filter((p) => p.stop === stop)
  const others = STOP_ORDER.filter((s) => s !== stop)
  return (
    <ul className="pm-list">
      {own.map((p) => (
        <li key={p.slug}>
          <Link to={'/world/place/' + p.slug}>
            <i style={{ background: p.colour }} />
            <span><b>{p.name}</b><small>{p.line}</small></span>
            <em className="fig">{p.stop === 'world' ? timeIn(p.tz, now) : p.town === 'Fontana' ? (p.home ? 'Home' : 'Fontana') : `${Math.round(milesBetween(HOME_TOWN, p))} mi`}</em>
          </Link>
        </li>
      ))}
      {others.map((s) => {
        const n = PLACES.filter((p) => p.stop === s).length
        return (
          <li key={s} className="pm-zoom">
            <button type="button" onClick={() => onStop(s)}>
              <span><b>{STOPS[s].name}</b><small>{n} {n === 1 ? 'place' : 'places'} {STOP_ORDER.indexOf(s) < STOP_ORDER.indexOf(stop) ? 'closer in' : 'further out'}</small></span>
              <em>›</em>
            </button>
          </li>
        )
      })}
      <li className="pm-note"><small>Each place sits at its town. Open one to find it in your maps app.</small></li>
    </ul>
  )
}
