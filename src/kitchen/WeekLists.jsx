import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Toast } from '../ui/Toast.jsx'
import { useDraft } from '../lib/useDraft.js'
import { weekLists } from '../lib/kitchen/week.js'
import { parsed } from './art.js'
import { FoodIcon } from './FoodIcon.jsx'
import { iconFor } from '../lib/kitchen/food.js'

/** The week's two lists beside Jason's own grocery list: what must be bought, and what to check. */
export default function WeekLists({ bodies, weekOf }) {
  const [ticked, setTicked] = useDraft(`week.${weekOf}`, {})
  // "Done shopping" is remembered on this device against these very dishes: add or cook one and the lists come back
  const [done, setDone, clearDone] = useDraft(`week.${weekOf}.done`, { sig: '' })
  const [undo, setUndo] = useState(false)
  if (!bodies.length) return null
  const dishes = bodies.map((b) => ({ title: parsed(b.body).title, groups: parsed(b.body).groups }))
  const sig = dishes.map((d) => d.title).sort().join('|')
  const lists = weekLists(dishes)
  if (done.sig === sig) return <div className="span-6"><button type="button" className="btn ghost on-sky" onClick={clearDone}>Show the shopping lists</button></div>
  const List = ({ which, title, word }) => (
    <div className="wl">
      <h3>{title}</h3>
      <p className="muted small">{word}</p>
      {lists[which].map((s) => (
        <div key={s.shelf} className="wl-shelf">
          <h4>{s.shelf}</h4>
          <ul>
            {s.items.map((it) => {
              const k = `${which}:${it.name}`
              return (
                <li key={k}>
                  <label className={ticked[k] ? 'got' : ''}>
                    <input type="checkbox" checked={Boolean(ticked[k])} onChange={(e) => setTicked({ ...ticked, [k]: e.target.checked })} />
                    <FoodIcon name={iconFor(it.name)} size={26} />
                    <span><b>{it.name}</b><span className="wl-uses">{it.uses.map((u) => `${u.amount ? u.amount + ' ' : ''}for ${u.recipe}`).join(' · ')}</span></span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
  return (
    <Card tint="#3E7A4C" label="This week’s two lists" glyph="pot" tag={`${bodies.length} ${bodies.length === 1 ? 'dish' : 'dishes'}`} className="span-6 week-lists">
      <div className="wl-pair">
        <List which="buy" title="Probably buy" word="Fresh things these dishes call for, unless some are still in the fridge." />
        <List which="check" title="Check the pantry" word="Staples to look for before you go: the fridge, the freezer, the shelves." />
      </div>
      <div className="wl-done"><button type="button" className="btn" onClick={() => { setDone({ sig }); setUndo(true) }}>Done shopping</button><span className="muted small">Puts these lists away until the dishes change.</span></div>
      {undo && <Toast action="Undo" onAction={() => { clearDone(); setUndo(false) }} onClose={() => setUndo(false)}>Shopping lists put away.</Toast>}
    </Card>
  )
}
