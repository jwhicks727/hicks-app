import { useLayoutEffect, useRef, useState } from 'react'
import { entryKey, tickFor } from '../../lib/routines.js'
import { reducedMotion } from '../../lib/motion.js'
import { ItemIcon } from './icons.jsx'

// One list for one day: what's left, in order, and a pile of what's done.
// A tap ticks a thing: the box springs and fills, the check draws itself,
// feathers burst from it in the morning (stars at night; gold for the day's
// golden feather; every colour on a birthday), a line strikes through the
// words, and the row slips away into the pile while the rest glide up to
// close the gap. Tapping a thing in the pile puts it back. `tools` (the
// quiet + and Skip, DayTools) share the pile's line. Transforms and opacity
// only; under less motion, a plain fade.

const GOING_MS = 720
const rand = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
const BIRTHDAY = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#AF52DE', '#FF2D55']

function Burst({ kind, n }) {
  return (
    <span className={'dl-burst ' + kind} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ '--a': `${(i / n) * 360 + rand(i, 1) * 24}deg`, '--d': `${26 + rand(i, 2) * 26}px`, '--r': `${rand(i, 3) * 300 - 150}deg`, '--t': `${0.5 + rand(i, 4) * 0.35}s`, ...(kind === 'party' ? { '--c': BIRTHDAY[i % BIRTHDAY.length] } : {}) }} />
      ))}
    </span>
  )
}

function sub(e) {
  const bits = []
  if (e.turn) bits.push(`${e.turn.of_what} · ${e.turn.k + 1} of ${e.turn.of}`)
  if (e.kind === 'extra') bits.push('just today')
  if (e.item && e.item.school === 'school') bits.push('school day')
  if (e.item && e.item.school === 'off') bits.push('day off')
  return bits.join(' · ')
}

/**
 * `list` is dayList()'s; `ticks` the day's. `onTick(entry)` and `onUntick(entry)`
 * do the work (and the sounds); `golden` is the key of the day's golden thing.
 */
export function RoutineList({ part, list, ticks, golden, birthday = false, onTick, onUntick, onSkip = null, onUnskip = null, label, tools = null }) {
  const [going, setGoing] = useState({}) // key -> 'gold' | 'party' | part: rows still animating out
  const [pileOpen, setPileOpen] = useState(false)
  const [skipOpen, setSkipOpen] = useState(false)
  const skipped = list.skippedEntries || []
  const ul = useRef(null), tops = useRef(new Map())
  const done = list.entries.filter((e) => tickFor(e, ticks))
  const open = list.entries.filter((e) => !tickFor(e, ticks) || going[entryKey(e)])

  // The rest glide up to close the gap (FLIP: measured before and after, moved by transform)
  useLayoutEffect(() => {
    const el = ul.current
    if (!el) return
    const next = new Map()
    for (const li of el.children) next.set(li.dataset.key, li.getBoundingClientRect().top)
    if (!reducedMotion()) {
      for (const li of el.children) {
        const before = tops.current.get(li.dataset.key), after = next.get(li.dataset.key)
        if (before != null && Math.abs(before - after) > 1 && li.animate) li.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' })
      }
    }
    tops.current = next
  })

  const tap = (e) => {
    const k = entryKey(e)
    if (going[k]) return
    const kind = k === golden ? 'gold' : birthday ? 'party' : part
    setGoing((g) => ({ ...g, [k]: kind }))
    setTimeout(() => setGoing((g) => { const x = { ...g }; delete x[k]; return x }), reducedMotion() ? 200 : GOING_MS)
    onTick(e, { golden: k === golden })
  }

  return (
    <div className={'dl-listwrap dl-' + part}>
      {open.length > 0 && (
        <ul className="dl-list" ref={ul} aria-label={label}>
          {open.map((e) => {
            const k = entryKey(e), g = going[k]
            return (
              <li key={k} data-key={k} className={(g ? 'dl-going' : '') + (k === golden && !g ? ' dl-golden' : '') + (onSkip && e.kind === 'item' && !g ? ' dl-skippable' : '')}>
                <button type="button" className="dl-row" aria-pressed={Boolean(g)} onClick={() => tap(e)}>
                  <span className="dl-box">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path className="dl-check" d="M5.5 12.5l4.2 4.2 8.8-9.4" /></svg>
                    {g && <Burst kind={g} n={g === 'gold' ? 16 : g === 'party' ? 18 : 11} />}
                  </span>
                  <span className="dl-t">
                    <span className="dl-words">{e.title}</span>
                    {sub(e) && <small>{sub(e)}</small>}
                  </span>
                  {k === golden && !g && <span className="dl-gold-tag" aria-label="today’s golden feather">✦</span>}
                  {e.icon && <ItemIcon name={e.icon} />}
                </button>
                {onSkip && e.kind === 'item' && !g && <button type="button" className="dl-skipb" aria-label={`Skip ${e.title} today`} title="Skip today, without ticking it" onClick={() => onSkip(e)}>Skip</button>}
              </li>
            )
          })}
        </ul>
      )}
      {(done.length > 0 || skipped.length > 0 || tools) && (
        <div className="dl-pile">
          <div className="dl-pile-row">
            {done.length > 0 && (
              <button type="button" className="dl-pile-b" aria-expanded={pileOpen} onClick={() => setPileOpen((x) => !x)}>
                <span className="dl-pile-n" key={done.length}>✓ {done.length}</span> done{pileOpen ? '' : ': tap to see'}
              </button>
            )}
            {skipped.length > 0 && (
              <button type="button" className="dl-pile-b" aria-expanded={skipOpen} onClick={() => setSkipOpen((x) => !x)}>
                <span className="dl-pile-n">{skipped.length}</span> skipped{skipOpen ? '' : ': tap to see'}
              </button>
            )}
            {tools}
          </div>
          {skipOpen && skipped.length > 0 && (
            <ul className="dl-list dl-done dl-skipped" aria-label="Skipped today">
              {skipped.map((e) => (
                <li key={'s' + e.id} className="dl-skippable">
                  <span className="dl-row dl-row-skipped"><span className="dl-t"><span className="dl-words">{e.title}</span><small>skipped today, not ticked</small></span></span>
                  {onUnskip && <button type="button" className="dl-skipb" aria-label={`Put ${e.title} back on today’s list`} onClick={() => onUnskip(e)}>Put back</button>}
                </li>
              ))}
            </ul>
          )}
          {pileOpen && done.length > 0 && (
            <ul className="dl-list dl-done">
              {done.map((e) => (
                <li key={entryKey(e)}>
                  <button type="button" className="dl-row" aria-pressed="true" onClick={() => onUntick(e)} aria-label={`${e.title}: done. Tap to put it back`}>
                    <span className="dl-box on"><svg viewBox="0 0 24 24" aria-hidden="true"><path className="dl-check" d="M5.5 12.5l4.2 4.2 8.8-9.4" /></svg></span>
                    <span className="dl-t"><span className="dl-words">{e.title}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
