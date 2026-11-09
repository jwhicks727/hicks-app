import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { parseRecipe, sharedBody, easyOnHands } from './kitchen/recipe.js'
import { artFor } from './kitchen/food.js'

/**
 * Every recipe (without its body), with ratings, what's in the fridge and what is still to shop
 * for (Hunt & gather: a fridge row with no `bought_on`: still to shop for), and what has been got for those (`got`).
 */
export function useCookbook(session) {
  const [state, setState] = useState({ recipes: [], ratings: [], fridge: [], got: [], cooked: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ recipes: [], ratings: [], fridge: [], got: [], cooked: [], loaded: Boolean(supabase && session === null), error: null }); return undefined }
    const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10)
    Promise.all([
      fetchAll(() => supabase.from('recipes').select('id, slug, title, total_minutes, hands_on_minutes, serves, tags, art, created_at').order('title').order('id')),
      fetchAll(() => supabase.from('recipe_ratings').select('recipe_id, member_id, stars').order('id')),
      supabase.from('fridge').select('id, recipe_id, added_on, bought_on, status, done_on, fridge_got(item)').eq('status', 'waiting').order('added_on'),
      fetchAll(() => supabase.from('fridge').select('id, recipe_id, done_on').eq('status', 'cooked').gte('done_on', since).order('done_on').order('id')),
    ]).then(([r, g, f, c]) => {
      if (!live) return
      const fridge = (f.data || []).map(({ fridge_got: items, ...row }) => row)
      const got = (f.data || []).flatMap((row) => (row.fridge_got || []).map((x) => ({ fridge_id: row.id, item: x.item })))
      setState({ recipes: r.data || [], ratings: g.data || [], fridge, got, cooked: c.data || [], loaded: true, error: (r.error || g.error || f.error || c.error || {}).message || null })
    })
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** One recipe, read whole: its file, Laurie's plate (parents only), its ratings and fridge row. */
export function useRecipe(session, slug) {
  const [state, setState] = useState({ recipe: null, laurie: null, ratings: [], fridge: null, loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !slug) { setState({ recipe: null, laurie: null, ratings: [], fridge: null, loaded: Boolean(supabase && session === null), error: null }); return undefined }
    supabase.from('recipes').select('*').eq('slug', slug).maybeSingle().then(async ({ data: recipe, error }) => {
      if (!live) return
      if (error || !recipe) { setState({ recipe: null, laurie: null, ratings: [], fridge: null, loaded: true, error: error ? error.message : null }); return }
      const [p, g, f] = await Promise.all([
        supabase.from('recipe_private').select('laurie_plate').eq('recipe_id', recipe.id).maybeSingle(),
        supabase.from('recipe_ratings').select('member_id, stars').eq('recipe_id', recipe.id),
        supabase.from('fridge').select('id, added_on, bought_on, status').eq('recipe_id', recipe.id).eq('status', 'waiting').maybeSingle(),
      ])
      if (live) setState({ recipe, laurie: p.data ? p.data.laurie_plate : null, ratings: g.data || [], fridge: f.data || null, loaded: true, error: null })
    })
    return () => { live = false }
  }, [session, slug, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** Save recipe files: a new slug adds, a known one replaces (Jason re-exports from Obsidian). */
/**
 * Recipes saved by title (a same-titled one is replaced). A file may come as
 * { md, slug } to change that recipe whatever its title says now (a change
 * from the Kitchen chat), keeping its ratings and its place in the fridge.
 */
export async function saveRecipes(files) {
  const results = []
  for (const f of files) {
    const md = typeof f === 'string' ? f : f.md
    const r = parseRecipe(md)
    const slug = typeof f === 'object' && f.slug ? f.slug : r.slug
    const row = { slug, title: r.title.slice(0, 200), body: sharedBody(md).slice(0, 60000), total_minutes: r.total, hands_on_minutes: r.handsOn, serves: r.serves, tags: easyOnHands(md) ? ['easy-on-hands'] : [], art: artFor(r) }
    const { data, error } = await supabase.from('recipes').upsert(row, { onConflict: 'slug' }).select('id').single()
    if (error) { results.push({ title: r.title, error: error.message }); continue }
    // A change that took Laurie's plate out takes it out of the private copy too (it was read before saving)
    if (!r.laurie && typeof f === 'object' && f.slug) await supabase.from('recipe_private').delete().eq('recipe_id', data.id)
    if (r.laurie) await supabase.from('recipe_private').upsert({ recipe_id: data.id, laurie_plate: r.laurie.slice(0, 8000), updated_at: new Date().toISOString() }, { onConflict: 'recipe_id' })
    results.push({ title: r.title, slug, id: data.id, ok: true })
  }
  return results
}

export async function rate(recipeId, memberId, stars) {
  return supabase.from('recipe_ratings').upsert({ recipe_id: recipeId, member_id: memberId, stars, rated_at: new Date().toISOString() }, { onConflict: 'recipe_id,member_id' })
}
/** "Add to this week": the dish is on the Hunt & gather list (no `bought_on`) until it is shopped for. */
export async function addToFridge(recipeId, today) { return supabase.from('fridge').insert({ recipe_id: recipeId, added_on: today }) }
export async function finishFridge(fridgeId, status, today) { return supabase.from('fridge').update({ status, done_on: today }).eq('id', fridgeId) }
/** Dishes still to shop for, shopped for: into the fridge today. `back` undoes it. */
export async function intoFridge(ids, today) { return supabase.from('fridge').update({ bought_on: today }).in('id', ids).is('bought_on', null) }
export async function backToShopping(ids) { return supabase.from('fridge').update({ bought_on: null }).in('id', ids) }
/** Things crossed off a dish's shopping list ([{ fridge_id, item, got_on }]), and back on again. */
export async function markGot(rows) { return supabase.from('fridge_got').upsert(rows, { onConflict: 'fridge_id,item', ignoreDuplicates: true }) }
export async function unmarkGot(rows) {
  for (const id of new Set(rows.map((r) => r.fridge_id))) {
    const { error } = await supabase.from('fridge_got').delete().eq('fridge_id', id).in('item', rows.filter((r) => r.fridge_id === id).map((r) => r.item))
    if (error) return { error }
  }
  return { error: null }
}
export async function removeRecipe(recipeId) { return supabase.from('recipes').delete().eq('id', recipeId) }

/** The files of the week's picked recipes, for the week's lists. */
export function useRecipeBodies(session, ids) {
  const [bodies, setBodies] = useState([])
  const key = ids.join(',')
  useEffect(() => {
    let live = true
    if (!supabase || !session || !ids.length) { setBodies([]); return undefined }
    supabase.from('recipes').select('id, title, body').in('id', ids).then(({ data }) => { if (live) setBodies(data || []) })
    return () => { live = false }
  }, [session, key]) // eslint-disable-line react-hooks/exhaustive-deps
  return bodies
}

/** Every recipe's shared file (never Laurie's plate), for searching by ingredient and sorting into shelves: id -> body. */
export function useAllBodies(session, enabled = true) {
  const [bodies, setBodies] = useState({})
  useEffect(() => {
    let live = true
    if (!supabase || !session || !enabled) { setBodies({}); return undefined }
    fetchAll(() => supabase.from('recipes').select('id, body').order('id')).then(({ data }) => {
      if (live) setBodies(Object.fromEntries((data || []).map((r) => [r.id, r.body])))
    })
    return () => { live = false }
  }, [session, enabled])
  return bodies
}

/** Which recipes have Laurie's plate written (parents only: the table answers nobody else): a Set of ids, or null. */
export function useLaurieWritten(session, parent) {
  const [ids, setIds] = useState(null)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !parent) { setIds(null); return undefined }
    fetchAll(() => supabase.from('recipe_private').select('recipe_id').order('recipe_id')).then(({ data, error }) => { if (live) setIds(error ? null : new Set((data || []).map((r) => r.recipe_id))) })
    return () => { live = false }
  }, [session, parent])
  return ids
}
