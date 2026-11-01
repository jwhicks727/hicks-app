import { useEffect, useRef, useState } from 'react'
import { loadPlanRecipes, keepPlanRecipes } from './useKitchenPlan.js'

// The full recipes Claude wrote for a plan's picks, kept until they are saved
// to the cookbook or put away. Kept on the device at once (so a closed app
// loses nothing) and in the database with the plan (so another phone, or a
// sign-out, loses nothing either). They are looked up by the plan, never by
// the calendar week: a list waiting for Laurie's answer stays put.

const PREFIX = 'teamhicks.draft.'
const ls = (fn) => { try { return fn(localStorage) } catch { return null } }
const read = (key) => ls((s) => { const v = s.getItem(PREFIX + key); return v ? JSON.parse(v).recipes || [] : null })

/** Where the device keeps them: by plan, with the old per-week key read once for plans made before this. */
export const writtenKey = (plan) => `kitchen.plan.written.${plan ? plan.id : 'none'}`
export const legacyWrittenKey = (plan) => (plan ? `kitchen.plan.written.${plan.week_of}` : null)

/** [recipes (Markdown files), setRecipes, clear] for a plan. */
export function usePlanWritten(plan) {
  const id = plan ? plan.id : null
  const [recipes, setRecipes] = useState([])
  const loaded = useRef(null)
  useEffect(() => {
    let live = true
    loaded.current = null
    setRecipes([])
    if (!plan) return undefined
    const here = read(writtenKey(plan)), old = legacyWrittenKey(plan) ? read(legacyWrittenKey(plan)) : null
    const first = (here && here.length ? here : old && old.length ? old : []) || []
    if (first.length) { setRecipes(first); loaded.current = id; if (!(here && here.length)) { ls((s) => s.setItem(PREFIX + writtenKey(plan), JSON.stringify({ recipes: first }))); keepPlanRecipes(id, first) } return undefined }
    loadPlanRecipes(id).then((r) => { if (live) { if (r && r.length) { setRecipes(r); ls((s) => s.setItem(PREFIX + writtenKey(plan), JSON.stringify({ recipes: r }))) } loaded.current = id } })
    return () => { live = false }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (next) => {
    setRecipes(next)
    if (!plan) return
    if (next.length) ls((s) => s.setItem(PREFIX + writtenKey(plan), JSON.stringify({ recipes: next }))); else ls((s) => s.removeItem(PREFIX + writtenKey(plan)))
    keepPlanRecipes(id, next).catch(() => { /* the table isn't there yet: the device keeps them */ })
  }
  const clear = () => { set([]); const old = legacyWrittenKey(plan); if (old) ls((s) => s.removeItem(PREFIX + old)) }
  return [recipes, set, clear]
}
