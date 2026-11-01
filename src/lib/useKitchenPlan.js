import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// The Kitchen's own settings and the week's plan, read and saved as the
// signed-in member: row-level security decides (Laurie's rules: Jason and
// Laurie only; preferences: the family reads, the parents write).

function useRows(session, fetcher, deps) {
  const [state, setState] = useState({ rows: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ rows: [], loaded: Boolean(supabase && session === null), error: null }); return undefined }
    fetcher().then(({ data, error }) => { if (live) setState({ rows: data || [], loaded: true, error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, n, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** Every version of the kitchen's preferences, newest first. */
export const usePreferences = (session) => useRows(session, () => supabase.from('kitchen_preferences').select('id, body, note, created_by, created_at').order('created_at', { ascending: false }).limit(50), [])
/** Every version of Laurie's food rules, newest first (parents only; others get none). */
export const useFoodRules = (session) => useRows(session, () => supabase.from('food_rules').select('id, belongs_to, body, note, created_by, created_at').order('created_at', { ascending: false }).limit(50), [])
/** The newest plans, newest first: the open one is the first nobody has put away (openPlan in lib/kitchen/plan.js). */
export const usePlans = (session) => useRows(session, () => supabase.from('week_plans').select('*').order('created_at', { ascending: false }).limit(12), [])

export const savePreferences = (body, note, me) => supabase.from('kitchen_preferences').insert({ body: body.slice(0, 20000), note: (note || '').slice(0, 500) || null, created_by: me ? me.id : null })
export const saveFoodRules = (belongsTo, body, note, me) => supabase.from('food_rules').insert({ belongs_to: belongsTo, body: body.slice(0, 20000), note: (note || '').slice(0, 500) || null, created_by: me ? me.id : null })

/** Ideas saved for the week: a new plan, or the latest one changed. */
export async function savePlan(plan, patch, weekOf, me) {
  if (plan && plan.id) return supabase.from('week_plans').update(patch).eq('id', plan.id).select().single()
  return supabase.from('week_plans').insert({ week_of: weekOf, created_by: me ? me.id : null, ...patch }).select().single()
}

/** Put a plan away: it leaves the screen and is kept in the database. */
export const dismissPlan = (plan) => supabase.from('week_plans').update({ dismissed_at: new Date().toISOString() }).eq('id', plan.id)

/** The newest plan nobody has put away, read fresh (for the chat, which isn't on the plan's screen). */
export async function fetchOpenPlan() {
  const { data } = await supabase.from('week_plans').select('*').order('created_at', { ascending: false }).limit(12)
  return (data || []).find((r) => !r.dismissed_at) || null
}

/** The recipes written for a plan, kept with it (parents only). Quietly empty if the table isn't there yet. */
export async function loadPlanRecipes(planId) {
  const { data, error } = await supabase.from('week_plan_recipes').select('recipes').eq('plan_id', planId).maybeSingle()
  return error || !data ? null : data.recipes
}
export async function keepPlanRecipes(planId, recipes) {
  if (!recipes.length) return supabase.from('week_plan_recipes').delete().eq('plan_id', planId)
  return supabase.from('week_plan_recipes').upsert({ plan_id: planId, recipes, updated_at: new Date().toISOString() }, { onConflict: 'plan_id' })
}
