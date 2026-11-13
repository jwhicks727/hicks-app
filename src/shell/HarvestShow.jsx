import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { styleFor } from '../lib/harvest.js'
import GarlandShow from './GarlandShow.jsx'
import { findFrame, lookAt, sheetsFor } from './harvest/kit.js'
import { playGolden } from './harvest/golden.js'
import { playWhirl } from './harvest/whirl.js'
import { playEmbers } from './harvest/embers.js'
import { playWheel } from './harvest/wheel.js'
import { playLake } from './harvest/lake.js'
import { playTumble } from './harvest/tumble.js'
import { playPetals } from './harvest/petals.js'
import { playBeam } from './harvest/beam.js'

// Thanksgiving week's show, played from the painting Home hangs that day (src/lib/harvest.js picks the painting, every
// two days the next of her Thanksgiving paintings). The phone looks at that painting's own pixels and chooses the show
// it suits: a stream she painted carries her leaves down it, a fire throws embers, a golden painting has its golden
// rain, and the rest whirl or gather into a garland. Each is a copy of her pixels over a painting that stays whole;
// where no painting hangs in view nothing plays and nothing stands in. "Play it" and the Art card's button play it again
// ("hicks:show"). Transforms and opacity only; it never takes a tap, and SeasonShow never starts it under less motion.
const NEEDS_LEAVES = ['stream', 'garland', 'golden', 'whirl', 'lake', 'beam']
const WAIT_S = 2.5 // seconds after the page opens until the show begins

export default function HarvestShow({ show, list, path, day }) {
  const layer = useRef(null)
  const [again, setAgain] = useState(0)
  const [plan, setPlan] = useState(null) // { style } once the painting has been looked at, for the stream and the garland
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    const on = () => setAgain((n) => n + 1)
    window.addEventListener('hicks:show', on)
    return () => window.removeEventListener('hicks:show', on)
  }, [])

  useEffect(() => {
    let live = true, stop = () => {}
    setPlan(null)
    const timer = setTimeout(async () => {
      const found = findFrame(listRef.current, show.sheets.map((s) => s.slug))
      if (!found || !live) return
      const { el, p } = found
      const look = await lookAt(p)
      if (!live || !el.isConnected) return
      const style = styleFor(look || {}, p.slug, day)
      // The shows that cut their pieces from the painting itself need no leaves; the others take leaves cut from it (or the season's)
      const sheets = NEEDS_LEAVES.includes(style) ? await sheetsFor(p, show) : []
      if (!live || !el.isConnected || (NEEDS_LEAVES.includes(style) && !sheets.length)) return
      if (style === 'stream' || style === 'garland') { setPlan({ style, sheets }); return }
      const ctx = { layer: layer.current, list: listRef.current, p, el, sheets, look }
      const play = { golden: playGolden, whirl: playWhirl, embers: playEmbers, wheel: playWheel, lake: playLake, tumble: playTumble, petals: playPetals, beam: playBeam }[style]
      stop = play ? play(ctx) : () => {}
    }, (again ? 0.2 : WAIT_S) * 1000)
    return () => { live = false; clearTimeout(timer); stop() }
  }, [show, path, day, again])

  return (
    <>
      {createPortal(<div className="hv-layer" ref={layer} aria-hidden="true" />, document.body)}
      {plan && <GarlandShow key={`${plan.style}-${again}`} show={show} sheets={plan.sheets} list={list} path={path} force={plan.style} first={0.1} />}
    </>
  )
}
