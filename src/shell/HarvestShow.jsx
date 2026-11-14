import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { styleFor } from '../lib/harvest.js'
import { cutFruit } from '../lib/harvestFind.js'
import { windOf } from '../lib/wind.js'
import { useWeather } from '../lib/useWeather.js'
import GarlandShow from './GarlandShow.jsx'
import WindShow from './WindShow.jsx'
import { lookAt, sheetsFor } from './harvest/kit.js'
import { runLead } from './harvest/lead.js'
import { runLinger } from './harvest/linger.js'
import { playGolden } from './harvest/golden.js'
import { playWhirl } from './harvest/whirl.js'
import { playEmbers } from './harvest/embers.js'
import { playWheel } from './harvest/wheel.js'
import { playLake } from './harvest/lake.js'
import { playTumble } from './harvest/tumble.js'
import { playPetals } from './harvest/petals.js'
import { playBeam } from './harvest/beam.js'

// A season's show, with the witch's shape (decisions log, 2026-11-13): it starts at the top of Home, something gorgeous made
// of the painting carries you down to it as her crow does, the page following (src/shell/harvest/lead.js); the painting's own
// show plays there (src/shell/harvest/*.js, GarlandShow, WindShow); and something subtle made of it stays with you on every
// screen all day (src/shell/harvest/linger.js). Home hangs the painting of the day (src/lib/harvest.js, the next of her paintings
// for the season every two days) and the phone reads its pixels to choose which show it gets. The first two parts play
// once a day on each device, like the crow, and again on "Play it" or the Art card's button ("hicks:show"). Copies of her
// pixels over a painting that stays whole; transforms and opacity only; it never takes a tap, and SeasonShow never starts
// it under less motion or on a quiet screen.
const NEEDS_LEAVES = ['stream', 'garland', 'wind', 'golden', 'whirl', 'lake', 'beam']
const KEY = 'teamhicks.shows' // which painting's show has played today on this device (Settings' "Play it again" clears it)
const playedToday = (slug, day) => { try { return (JSON.parse(localStorage.getItem(KEY)) || {})[slug] === day } catch { return false } }
const markPlayed = (slug, day) => { try { const m = JSON.parse(localStorage.getItem(KEY)) || {}; m[slug] = day; localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* fine */ } }
const ACTS = { golden: playGolden, whirl: playWhirl, embers: playEmbers, lake: playLake, tumble: playTumble, petals: playPetals, beam: playBeam }

export default function HarvestShow({ show, list, path, day }) {
  const layer = useRef(null), lingerLayer = useRef(null)
  const { forecast } = useWeather()
  const sideRef = useRef(1)
  sideRef.current = windOf(forecast ? forecast.now : null).side
  const [again, setAgain] = useState(0)
  const [kit, setKit] = useState(null) // the painting of the day, read: { p, look, style, parts }
  const [plan, setPlan] = useState(null) // the shows drawn by React: the stream and the garland
  const [leading, setLeading] = useState(false)
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    const on = () => setAgain((n) => n + 1)
    window.addEventListener('hicks:show', on)
    return () => window.removeEventListener('hicks:show', on)
  }, [])

  // 1. Read the painting of the day once, on whichever screen: what it shows, which show suits it, the pieces cut from it
  useEffect(() => {
    let live = true
    setKit(null)
    const p = show.painting
    ;(async () => {
      const look = await lookAt(p)
      if (!live || !look) return
      const style = styleFor(look, p.slug, day)
      const sheets = NEEDS_LEAVES.includes(style) ? await sheetsFor(p, show) : []
      if (!live || (NEEDS_LEAVES.includes(style) && !sheets.length)) return
      setKit({ p, look, style, parts: { sheets, fruit: style === 'tumble' ? cutFruit(look.px480, { max: 11 }) : null } })
    })()
    return () => { live = false }
  }, [show.painting.slug, show.painting.src, day]) // eslint-disable-line react-hooks/exhaustive-deps -- the painting decides

  // 2. The subtle part, on every screen, all day (the wind's is the wind itself, below)
  useEffect(() => {
    if (!kit || kit.style === 'wind' || !lingerLayer.current) return undefined
    return runLinger(kit.style, { layer: lingerLayer.current, p: kit.p, look: kit.look, parts: kit.parts })
  }, [kit])

  // 3. From the top of Home down to the painting, then its show: once a day, and again when asked
  useEffect(() => {
    if (!kit) return undefined
    if (!again && (path !== '/' || playedToday(kit.p.slug, day))) return undefined
    let live = true, stopLead = () => {}, stopAct = () => {}, tries = 0, timer = 0
    setPlan(null)
    const go = async () => {
      if (!live) return
      const el = document.querySelector(`.pf[data-art-slug="${kit.p.slug}"]`)
      if (!el) { if (++tries < 30) timer = setTimeout(go, 500); return } // Home's Art card may still be loading
      setLeading(true)
      markPlayed(kit.p.slug, day)
      const ctx = { layer: layer.current, list: listRef.current, p: kit.p, el, look: kit.look, sheets: kit.parts.sheets, parts: kit.parts, side: sideRef.current }
      if (kit.style === 'wheel') { stopAct = playWheel({ ...ctx, lead: true }); setLeading(false); return }
      const lead = runLead(kit.style, ctx)
      stopLead = lead.stop
      await lead.done
      if (!live) return
      setLeading(false)
      if (kit.style === 'stream' || kit.style === 'garland') setPlan({ style: kit.style, sheets: kit.parts.sheets })
      else if (ACTS[kit.style]) stopAct = ACTS[kit.style](ctx)
    }
    timer = setTimeout(go, (again ? 0.3 : 1.2) * 1000)
    return () => { live = false; clearTimeout(timer); stopLead(); stopAct(); setLeading(false) }
  }, [kit, path, day, again]) // eslint-disable-line react-hooks/exhaustive-deps

  // The wind is its own show and its own subtle part: once its lead has landed, gusts lift the painting's leaves and carry
  // them over every screen
  const windShow = useMemo(() => (kit && kit.style === 'wind' ? { ...show, sheets: kit.parts.sheets } : null), [kit, show])
  return (
    <>
      {createPortal(<div className="hv-layer hv-linger" ref={lingerLayer} aria-hidden="true" />, document.body)}
      {createPortal(<div className="hv-layer" ref={layer} aria-hidden="true" />, document.body)}
      {windShow && !leading && <WindShow key={`wind-${again}`} show={windShow} list={list} path={path} />}
      {plan && <GarlandShow key={`${plan.style}-${again}`} show={show} sheets={plan.sheets} list={list} path={path} force={plan.style} first={0.1} />}
    </>
  )
}
