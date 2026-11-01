import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useNow } from '../../lib/useNow.js'
import { reducedMotion } from '../../lib/motion.js'
import { PLACES, STOPS, STOP_ORDER, RANGES, PEAKS, LAKES, pinsAt, fitCamera, viewBoxFor, toScreen, project, nearWeight, tween, calloutLabels, peakGlyphs, nightPath, milesBetween, minutesAhead } from '../../lib/places.js'
import { FREEWAYS } from '../../lib/freeways.js'
import Scene from './Scene.jsx'
import { usePlacesWeather } from '../../lib/useWeather.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import { HOME_TOWN } from '../../lib/sky.js'
import { DESERTS, FORESTS, ICE, BANDS, smoothRing, bandRect, rangePoints } from '../../lib/formations.js'

// The formations, made once: smooth outlines in world-map units
const SHAPES = { desert: DESERTS.map(([n, r]) => [n, smoothRing(r)]), forest: FORESTS.map(([n, r]) => [n, smoothRing(r)]), ice: ICE.map(([n, r]) => [n, smoothRing(r)]) }
const RANGE_POINTS = rangePoints()

// All our places on one map, at three sizes: around home, Southern
// California, the world. Each place is a pin with its name beside it (its
// time abroad, and its weather right now), a tap from its own page; a group
// of places too close to tell apart is one pin that zooms in. Zooming flies
// between the sizes. Around home draws the freeways, so it reads like the
// drive. Outlines and roads: Natural Earth (public domain).

const KEY = 'teamhicks.mapstop'
const timeIn = (tz, now) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(now)
const hourIn = (tz, now) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
const FAN = [[0, 0], [-12, 10], [12, 10], [0, 18]] // places in one town, round its centre (px)
const SIDE = 34

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

  // Room round the edge for a label beside a pin there; no bands
  const marginY = Math.round(dims.h * 0.75) + 10
  // The world is a wide strip: it runs nearly to the frame's sides, and its labels sit above and below it
  const target = data && size ? fitCamera(stop, size.W, size.H, marginY, stop === 'world' ? 10 : SIDE, data.NEAR) : null

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
  const labels = ready && !moving ? calloutLabels(pins.map((p) => ({ id: p.slug, x: spots[p.slug].x, y: spots[p.slug].y, w: dims.w[p.slug] || 90, h: dims.h })), { W: size.W, H: size.H }) : {}
  const labelBoxes = Object.entries(labels).map(([id, l]) => [l.left, l.top, l.left + (dims.w[id] || 90), l.top + dims.h])
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
      // Each range's name where it fits: inside the map, clear of the labels, the pins and each other
      const boxes = [...labelBoxes]
      for (const r of RANGES) {
        const name = stop === 'home' ? r.name : r.name.replace('Mountains', 'Mts'), [x, y] = at(...r.label), half = (name.length * 7.4) / 2
        const box = [x - half, y - 9, x + half, y + 3]
        const clear = box[0] > 4 && box[2] < W - 4 && box[1] > 4 && box[3] < H - 4 &&
          !boxes.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3]) &&
          !Object.values(spots).some((s) => s.x > box[0] - 6 && s.x < box[2] + 6 && s.y > box[1] - 6 && s.y < box[3] + 6)
        if (clear) { boxes.push(box); rangeNames.push({ name, xy: [x, y] }) }
      }
    }
  }
  // Snow on the high peaks from November to April
  const winter = (() => { const m = now.getMonth() + 1; return m >= 11 || m <= 4 })()
  // The world's mountain ranges as little peaks, a few px apart at any zoom
  let wpeaks = []
  if (ready && w < 0.95) {
    const { W, H } = size, gap = 9, kept = []
    for (const r of RANGE_POINTS) {
      const [x, y] = toScreen('world', cam, W, H, data.NEAR, r.lat, r.lng)
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue
      if (kept.some(([a, b]) => Math.abs(a - x) < gap && Math.abs(b - y) < gap * 0.7)) continue
      kept.push([x, y, r.big])
    }
    wpeaks = kept
  }
  const home = spots['group-socal'] || spots.home

  // The weather right now at every place this size shows, in one request
  const shown = useMemo(() => PLACES.filter((p) => p.stop === stop), [stop])
  const wx = usePlacesWeather(shown)
  // The freeways round home, drawn in the near layer while Around home shows
  const roads = useMemo(() => (data ? FREEWAYS.map((f) => ({ ...f, d: f.lines.map((l) => l.map(([lng, lat], i) => { const [x, y] = project('near', lat, lng, data.NEAR); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join('')).join('') })) : []), [data])
  const roadsOn = (stop === 'home' || stop === 'socal') && w > 0.5
  // Around home draws every freeway; SoCal only the big ones
  const drawn = stop === 'home' ? FREEWAYS : FREEWAYS.filter((f) => f.tier === 1)
  // Each freeway's number: at its usual spot if that's clear, else the nearest clear point along it
  const shields = []
  if (ready && roadsOn && !moving) {
    const taken = [...labelBoxes]
    for (const f of drawn) {
      const wd = f.num.length > 2 ? 28 : 22
      const want = f.label ? toScreen('near', cam, size.W, size.H, data.NEAR, f.label[1], f.label[0]) : null
      const pts = f.lines.flat().map(([lng, lat]) => toScreen('near', cam, size.W, size.H, data.NEAR, lat, lng))
      if (want) pts.unshift(want)
      const ref = want || pts[Math.floor(pts.length / 2)]
      pts.sort((a, b) => Math.hypot(a[0] - ref[0], a[1] - ref[1]) - Math.hypot(b[0] - ref[0], b[1] - ref[1]))
      for (const [x, y] of pts) {
        const b = [x - wd / 2 - 3, y - 11, x + wd / 2 + 3, y + 11]
        if (b[0] < 4 || b[2] > size.W - 4 || b[1] < 4 || b[3] > size.H - 4) continue
        if (taken.some((o) => o[0] < b[2] && b[0] < o[2] && o[1] < b[3] && b[1] < o[3])) continue
        if (Object.values(spots).some((p) => p.x > b[0] - 6 && p.x < b[2] + 6 && p.y > b[1] - 6 && p.y < b[3] + 6)) continue
        taken.push(b); shields.push({ id: f.id, num: f.num, interstate: f.interstate, wd, x, y }); break
      }
    }
  }

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
                <pattern id="pm-waves" width="14" height="8" patternUnits="userSpaceOnUse"><path d="M0 5q3.5-3 7 0t7 0" className="pm-wave" /></pattern>
                <pattern id="pm-dune-lines" width="9" height="6" patternUnits="userSpaceOnUse"><path d="M1 4q2.2-2.2 4.4 0" className="pm-dunes" vectorEffect="non-scaling-stroke" /></pattern>
                <linearGradient id="pm-near-land" x1="0" y1="1" x2="1" y2="0"><stop offset="0" className="pm-coast-a" /><stop offset=".5" className="pm-coast-b" /><stop offset="1" className="pm-coast-c" /></linearGradient>
              </defs>
              <rect x="-1000" y="-800" width="3000" height={data.WORLD.height + 1600} fill="url(#pm-sea)" />
              <path className="pm-grid" d={[...Array(13)].map((_, i) => `M${(i * 1000) / 12} 0V${data.WORLD.height}`).join('') + [...Array(5)].map((_, i) => `M-1000 ${((84 - (60 - i * 30)) / 360) * 1000}H2000`).join('')} vectorEffect="non-scaling-stroke" />
              <rect x="-1000" y="-800" width="3000" height={data.WORLD.height + 1600} fill="url(#pm-waves)" />
              {Object.entries(data.WORLD.regions || {}).map(([k, d]) => <path key={k} className={'pm-r pm-r-' + k} d={d} />)}
              <clipPath id="pm-landclip">{Object.entries(data.WORLD.regions || {}).map(([k, d]) => <path key={k} d={d} />)}</clipPath>
              <g clipPath="url(#pm-landclip)">
                {BANDS.map(([k, a, b], i) => { const r = bandRect(a, b); return <rect key={i} className={'pm-f-' + k} {...r} /> })}
                {SHAPES.forest.map(([n, d]) => <path key={n} className="pm-f-forest" d={d} />)}
                {SHAPES.desert.map(([n, d]) => <path key={n} className="pm-f-desert" d={d} />)}
                <rect x="-1000" y="0" width="3000" height={data.WORLD.height} fill="url(#pm-dune-lines)" clipPath="url(#pm-desertclip)" />
                {SHAPES.ice.map(([n, d]) => <path key={n} className="pm-f-ice" d={d} />)}
              </g>
              <clipPath id="pm-desertclip">{SHAPES.desert.map(([n, d]) => <path key={n} d={d} />)}</clipPath>
              <path className="pm-land pm-coastline" d={data.WORLD.land} vectorEffect="non-scaling-stroke" />
              <path className="pm-night" d={nightPath(now)} />
            </svg>
            <svg className="pm-layer" viewBox={viewBoxFor('near', cam, size.W, size.H, data.NEAR).join(' ')} preserveAspectRatio="none" style={{ opacity: w }} aria-hidden="true">
              <rect x="-4000" y="-4000" width="9000" height="9000" fill="url(#pm-sea)" />
              <rect x="-4000" y="-4000" width="9000" height="9000" fill="url(#pm-waves)" />
              <path className="pm-land pm-near-land" d={data.NEAR.land} vectorEffect="non-scaling-stroke" />
              {LAKES.map((l) => { const [x, y] = project('near', l.lat, l.lng, data.NEAR); return <ellipse key={l.name} className="pm-lake" cx={x} cy={y} rx={l.rx * data.NEAR.cos0 * data.NEAR.k} ry={l.ry * data.NEAR.k} transform={`rotate(${l.tilt} ${x} ${y})`} vectorEffect="non-scaling-stroke" /> })}
              <g className={'pm-roads' + (roadsOn ? ' on' : '')}>
                {roads.filter((f) => stop === 'home' || f.tier === 1).map((f) => <path key={f.id + 'c'} className={'pm-road-case' + (f.interstate ? ' i' : '')} d={f.d} vectorEffect="non-scaling-stroke" />)}
                {roads.filter((f) => stop === 'home' || f.tier === 1).map((f) => <path key={f.id} className={'pm-road' + (f.interstate ? ' i' : '')} d={f.d} vectorEffect="non-scaling-stroke" />)}
              </g>
            </svg>
            <svg className="pm-over" viewBox={`0 0 ${size.W} ${size.H}`} aria-hidden="true">
              <g className="pm-wpeaks" style={{ opacity: 1 - w }}>
                <path d={wpeaks.map(([x, y, big]) => { const s = big ? 1.25 : 1; return `M${(x - 4 * s).toFixed(1)} ${(y + 2.6 * s).toFixed(1)}L${x.toFixed(1)} ${(y - 3.2 * s).toFixed(1)}L${(x + 4 * s).toFixed(1)} ${(y + 2.6 * s).toFixed(1)}Z` }).join('')} />
                <path className="pm-snow" d={wpeaks.map(([x, y, big]) => { const s = big ? 1.25 : 1; return `M${(x - 1.6 * s).toFixed(1)} ${(y - 0.9 * s).toFixed(1)}L${x.toFixed(1)} ${(y - 3.2 * s).toFixed(1)}L${(x + 1.6 * s).toFixed(1)} ${(y - 0.9 * s).toFixed(1)}Z` }).join('')} />
              </g>
              <g className="pm-peaks" style={{ opacity: w }}>
                <path d={peaks.map(([x, y]) => `M${(x - 4.5 * g).toFixed(1)} ${(y + 3 * g).toFixed(1)}L${x.toFixed(1)} ${(y - 3 * g).toFixed(1)}L${(x + 4.5 * g).toFixed(1)} ${(y + 3 * g).toFixed(1)}Z`).join('')} />
                {bigPeaks.map((b) => <path key={b.name} d={`M${b.xy[0] - 8 * g} ${b.xy[1] + 5 * g}L${b.xy[0]} ${b.xy[1] - 6 * g}L${b.xy[0] + 8 * g} ${b.xy[1] + 5 * g}Z`} />)}
                {winter && <path className="pm-snow" d={bigPeaks.map((b) => `M${b.xy[0] - 3.3 * g} ${b.xy[1] - 1.5 * g}L${b.xy[0]} ${b.xy[1] - 6 * g}L${b.xy[0] + 3.3 * g} ${b.xy[1] - 1.5 * g}Z`).join('')} />}
                {rangeNames.map((r) => <text key={r.name} x={r.xy[0]} y={r.xy[1]} className="pm-range">{r.name.toUpperCase()}</text>)}
              </g>
              {roadsOn && !moving && shields.map((sh) => (
                <g key={'sh' + sh.id} className={'pm-shield' + (sh.interstate ? ' i' : '')} transform={`translate(${sh.x.toFixed(1)} ${sh.y.toFixed(1)})`}>
                  {sh.interstate ? <path d={`M${-sh.wd / 2} -8h${sh.wd}v6c0 6-${sh.wd / 2 - 2} 9-${sh.wd / 2} 11c-2-2-${sh.wd / 2} -5-${sh.wd / 2} -11z`} /> : <rect x={-sh.wd / 2} y="-8" width={sh.wd} height="16" rx="3" />}
                  <text y="3.6">{sh.num}</text>
                </g>
              ))}
              {stop === 'world' && !moving && home && pins.filter((p) => p.kind === 'place').map((p) => {
                const b = spots[p.slug], dx = b.x - home.x, dy = b.y - home.y, d = Math.hypot(dx, dy)
                return <path key={'arc' + p.slug} className="pm-arc" d={`M${home.x} ${home.y}Q${(home.x + b.x) / 2} ${(home.y + b.y) / 2 - d * 0.28} ${b.x} ${b.y}`} stroke={p.colour} />
              })}
              {pins.map((p) => {
                const s = spots[p.slug], l = labels[p.slug]
                if (!l || !l.far) return null
                const cx = Math.min(l.left + (dims.w[p.slug] || 90), Math.max(l.left, s.x)), cy = Math.min(l.top + dims.h, Math.max(l.top, s.y))
                return <path key={'lead' + p.slug} className="pm-lead" d={`M${s.x.toFixed(1)} ${s.y.toFixed(1)}L${cx.toFixed(1)} ${cy.toFixed(1)}`} />
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
          const here = wx[p.slug]
          const body = (
            <>
              <i style={{ background: p.colour }} />
              <span className="pc-t">
                <b>{p.name}</b>
                {p.kind === 'group' ? <small>{p.count} places ›</small> : (
                  <small className="pc-sub">
                    {p.stop === 'world' && <span className={'fig' + (night ? ' night' : '')}>{timeIn(p.tz, now)}</span>}
                    {here && <span className="pc-wx"><WeatherIcon pic={here.pic} size={16} /><span className="fig">{here.temp}°</span></span>}
                  </small>
                )}
              </span>
            </>
          )
          const props = { key: p.slug, ref: (el) => { chips.current[p.slug] = el }, className: 'pm-chip' + (on ? ' on' : ''), style: on ? { left: l.left, top: l.top } : undefined, tabIndex: on ? undefined : -1, 'aria-hidden': on ? undefined : true }
          return p.kind === 'group'
            ? <button type="button" {...props} onClick={() => setStop(p.to)} aria-label={`${p.name}: zoom in to ${p.count} places`}>{body}</button>
            : <Link to={'/world/place/' + p.slug} {...props}>{body}</Link>
        })}
      </div>
      <PlaceTiles stop={stop} now={now} wx={wx} onStop={setStop} />
    </Card>
  )
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
const towards = (p) => { const dy = p.lat - HOME_TOWN.lat, dx = (p.lng - HOME_TOWN.lng) * Math.cos(HOME_TOWN.lat * Math.PI / 180); return COMPASS[Math.round((((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) / 45) % 8] }
const dateIn = (tz, now) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)
const clockIn = (tz, now) => { const [h, m] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).format(now).split(':').map(Number); return h + m / 60 }

/** What's true there right now, in a few short facts: how far or how far ahead, the sun, the wind, rain. */
function nowFacts(p, w, now) {
  const facts = []
  if (p.stop === 'world') {
    const m = minutesAhead(p.tz, now), h = Math.abs(m) / 60, n = Number.isInteger(h) ? String(h) : h.toFixed(1)
    const day = dateIn(p.tz, now) > dateIn(HOME_TOWN.tz, now) ? ' · tomorrow' : dateIn(p.tz, now) < dateIn(HOME_TOWN.tz, now) ? ' · yesterday' : ''
    facts.push(m ? `${n} h ${m > 0 ? 'ahead' : 'behind'}${day}` : 'Same time as home')
  } else if (p.town !== 'Fontana') {
    facts.push(`${Math.round(milesBetween(HOME_TOWN, p))} mi ${towards(p)}`)
  } else facts.push(p.home ? 'Home' : 'In Fontana')
  if (w) {
    const t = clockIn(p.tz || HOME_TOWN.tz, now)
    if (w.sunriseH != null && t < w.sunriseH) facts.push(`Sunrise ${w.sunrise}`)
    else if (w.sunsetH != null && t < w.sunsetH) facts.push(`Sunset ${w.sunset}`)
    else facts.push('Dark out')
    if (w.wind != null && w.wind >= 15) facts.push(`Wind ${w.wind} mph`)
    if (w.rain != null && w.rain >= 30) facts.push(`${w.rain}% rain`)
  }
  return facts
}

/** The same places as tiles, each with what's happening there now; then the other sizes to zoom to. */
function PlaceTiles({ stop, now, wx, onStop }) {
  const own = PLACES.filter((p) => p.stop === stop)
  const others = STOP_ORDER.filter((s) => s !== stop)
  return (
    <div className="pm-tiles-wrap">
      <ul className="pm-tiles">
        {own.map((p) => {
          const w = wx[p.slug], night = p.tz && (hourIn(p.tz, now) < 6 || hourIn(p.tz, now) >= 19)
          return (
            <li key={p.slug}>
              <Link to={'/world/place/' + p.slug} className="pm-tile" style={{ '--c': p.colour }}>
                <Scene place={p} now={now} pic={w && w.pic} mini />
                <span className="pt-head"><b>{p.name}</b>{p.stop === 'world' && <em className={'fig' + (night ? ' night' : '')}>{timeIn(p.tz, now)}</em>}</span>
                <small className="pt-line">{p.line}</small>
                {w ? (
                  <span className="pt-wx">
                    <WeatherIcon pic={w.pic} size={34} label={w.words} />
                    <b className="fig">{w.temp}°</b>
                    <span><span>{w.words}</span><span className="fig">H {w.high}° · L {w.low}°</span></span>
                  </span>
                ) : <span className="pt-wx pt-wait" aria-hidden="true" />}
                <span className="pt-facts">{nowFacts(p, w, now).map((f) => <span key={f} className="fig">{f}</span>)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="pm-zooms">
        {others.map((s) => {
          const n = PLACES.filter((p) => p.stop === s).length
          return (
            <button key={s} type="button" className="pm-zoom" onClick={() => onStop(s)}>
              <span><b>{STOPS[s].name}</b><small>{n} {n === 1 ? 'place' : 'places'} {STOP_ORDER.indexOf(s) < STOP_ORDER.indexOf(stop) ? 'closer in' : 'further out'}</small></span>
              <em aria-hidden="true">›</em>
            </button>
          )
        })}
      </div>
      <p className="pm-note"><small>Each place sits at its town. Open one to find it in your maps app. Weather from Open-Meteo{stop === 'home' || stop === 'socal' ? '; freeways from Natural Earth, the 210 traced by hand' : ''}.</small></p>
    </div>
  )
}
