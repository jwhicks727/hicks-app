import { useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { shoppingList, crossOff, stillToShop } from '../lib/kitchen/week.js'
import { markGot, unmarkGot, intoFridge, backToShopping } from '../lib/useKitchen.js'
import { iconFor } from '../lib/kitchen/food.js'
import { reducedMotion } from '../lib/motion.js'
import { parsed } from './art.js'
import { FoodIcon } from './FoodIcon.jsx'
import RecipeTile from './RecipeTile.jsx'

const at = (g) => `${g.fridge_id}\u0000${g.item}`
const listOf = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/**
 * Hunt & gather: the dishes picked for this week and still to shop for, and their likely shopping
 * list. Crossing a thing off takes it off the list at once (with an Undo); a dish waiting on nothing
 * more goes into the fridge by itself, and when the list is empty the card goes with a poof. It is
 * all kept in the database (`fridge.bought_on`, `fridge_got`), so every phone sees the same list,
 * and nothing about it is remembered on a device.
 */
export default function HuntGather({ book, bodies, family, parent, today, onSaid }) {
  const rows = book.fridge.filter(stillToShop)
  // What was crossed off (true) or put back (false) here, ahead of the database's answer
  const overlay = useRef(new Map())
  const [, redraw] = useState(0)
  const [leaving, setLeaving] = useState({})
  const [poof, setPoof] = useState(false)
  const [err, setErr] = useState(null)
  const now = useRef({})

  const dishes = rows.map((f) => {
    const b = bodies.find((x) => x.id === f.recipe_id)
    return b ? { id: f.id, title: parsed(b.body).title, groups: parsed(b.body).groups } : null
  })
  const ready = dishes.every(Boolean)
  const gotNow = () => {
    const m = new Map(now.current.book.got.map((g) => [at(g), g]))
    for (const [k, on] of overlay.current) {
      const [fridge_id, item] = k.split('\u0000')
      if (on) m.set(k, { fridge_id, item }); else m.delete(k)
    }
    return [...m.values()]
  }
  now.current = { book, dishes: dishes.filter(Boolean), rows }
  if (!rows.length) return null

  const list = shoppingList(now.current.dishes, gotNow())
  const titleOf = (id) => (now.current.dishes.find((d) => d.id === id) || {}).title || 'That dish'
  const setGot = (add, on) => { for (const g of add) overlay.current.set(at(g), on); redraw((x) => x + 1) }
  const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 200) : ms))

  // Into the fridge: the card goes with a poof when nothing is left to shop for
  const moved = async (ids) => {
    if (ids.length >= now.current.rows.length) { setPoof(true); await wait(700) }
    now.current.book.reload()
  }
  const into = async (ids, words) => {
    setErr(null)
    const { error } = await intoFridge(ids, today)
    if (error) { setErr(`Couldn’t move ${ids.length === 1 ? titleOf(ids[0]) : 'them'} into the fridge: ${error.message}`); return }
    onSaid({ text: words, undo: async () => { const r = await backToShopping(ids); if (r.error) setErr(`Couldn’t undo that: ${r.error.message}`); now.current.book.reload() } })
    await moved(ids)
  }

  const tick = async (item) => {
    if (!parent || leaving[item.key]) return
    setErr(null)
    setLeaving((l) => ({ ...l, [item.key]: true }))
    await wait(420) // it strikes through and slides away first
    const add = crossOff(item, today)
    setGot(add, true)
    setLeaving((l) => { const n = { ...l }; delete n[item.key]; return n })
    const { error } = await markGot(add)
    if (error) { setGot(add, false); setErr(`Couldn’t cross off ${item.name}: ${error.message}. It’s back on the list.`); return }
    const done = shoppingList(now.current.dishes, gotNow()).done
    let gone = []
    if (done.length) {
      const r = await intoFridge(done, today)
      if (r.error) setErr(`Everything for ${listOf(done.map(titleOf))} is got, but it couldn’t go into the fridge: ${r.error.message}`)
      else gone = done
    }
    const names = gone.map(titleOf)
    onSaid({
      text: gone.length ? `Crossed off ${item.name}. ${listOf(names)} ${names.length === 1 ? 'is' : 'are'} in the fridge.` : `Crossed off ${item.name}.`,
      undo: async () => {
        setGot(add, false)
        const a = await unmarkGot(add), b = gone.length ? await backToShopping(gone) : { error: null }
        if (a.error || b.error) setErr(`Couldn’t undo that: ${(a.error || b.error).message}`)
        now.current.book.reload()
      },
    })
    if (gone.length) await moved(gone)
  }

  const shelf = (which, title, word) => (
    <div className="wl">
      <h3>{title}</h3>
      <p className="muted small">{word}</p>
      {list[which].length === 0 && <p className="hg-clear">All crossed off.</p>}
      {list[which].map((s) => (
        <div key={s.shelf} className="wl-shelf">
          <h4>{s.shelf}</h4>
          <ul>
            {s.items.map((it) => (
              <li key={it.key} className={leaving[it.key] ? 'going' : ''}>
                <label>
                  <input type="checkbox" checked={Boolean(leaving[it.key])} disabled={!parent} onChange={() => tick(it)} aria-label={`Got ${it.name}`} />
                  <FoodIcon name={iconFor(it.name)} size={26} />
                  <span><b>{it.name}</b><span className="wl-uses">{it.uses.map((u) => `${u.amount ? u.amount + ' ' : ''}for ${u.recipe}`).join(' · ')}</span></span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )

  return (
    <Card tint="#3E7A4C" label="Hunt & gather" glyph="pot" tag={`${rows.length} to shop for`} className={'span-6 hunt-gather' + (poof ? ' poof' : '')}>
      {poof && <span className="hg-puffs" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
      <p className="muted">Picked for this week and still to shop for. Cross things off as you get them: once a dish has everything, it moves into the fridge by itself.</p>
      <div className="tiles">
        {rows.map((f) => {
          const r = book.recipes.find((x) => x.id === f.recipe_id)
          if (!r) return null
          const left = list.left[f.id]
          return (
            <div key={f.id} className="hg-dish">
              <RecipeTile r={r} ratings={book.ratings} members={family.members} note={!ready ? undefined : left ? `${left} ${left === 1 ? 'thing' : 'things'} to get` : 'everything got'} />
              {parent && <button type="button" className="btn ghost hg-into" onClick={() => into([f.id], `${r.title} is in the fridge.`)}>Into the fridge</button>}
            </div>
          )
        })}
      </div>
      {ready && (
        <div className="wl-pair">
          {shelf('buy', 'Probably buy', 'Fresh things these dishes call for, unless some are still in the fridge.')}
          {shelf('check', 'Check the pantry', 'Staples to look for before you go: the fridge, the freezer, the shelves.')}
        </div>
      )}
      {!ready && <p className="muted">Reading the recipes…</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {parent && (
        <div className="wl-done">
          <button type="button" className="btn" onClick={() => into(rows.map((f) => f.id), rows.length === 1 ? 'All shopped: it’s in the fridge.' : `All shopped: ${rows.length} dishes are in the fridge.`)}>Done shopping</button>
          <span className="muted small">Moves {rows.length === 1 ? 'it' : `all ${rows.length}`} into the fridge, crossed off or not.</span>
        </div>
      )}
    </Card>
  )
}
