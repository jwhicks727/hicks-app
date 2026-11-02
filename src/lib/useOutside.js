import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { outsideProblem } from './outsideErrors.js'

// The stations and the birds: asked of their Edge Functions (which keep the
// last answer and ask the outside services at most every quarter hour and
// every hour), shared by every screen this visit. Signed out, or before a
// function is set up, there's nothing, and the screens say what's coming.

const kept = {} // name -> { data, at }
const subs = {} // name -> Set
const asking = {}
const AGAIN_MS = { stations: 15 * 60e3, birds: 60 * 60e3, 'birds-more': 3 * 60 * 60e3, wild: 12 * 60 * 60e3 }
const FUNCTION = { 'birds-more': 'birds' } // which Edge Function answers, when not the name
const BODY = { 'birds-more': { kind: 'more' } }

async function ask(name) {
  if (asking[name]) return
  asking[name] = true
  const { data, error } = await supabase.functions.invoke(FUNCTION[name] || name, { body: BODY[name] || {} })
  asking[name] = false
  const v = outsideProblem({ error, data, online: typeof navigator === 'undefined' || navigator.onLine !== false }) || data
  kept[name] = { data: v, at: Date.now() }
  ;(subs[name] || new Set()).forEach((f) => f(v))
}

function useOutside(name) {
  const session = useSession()
  const [v, setV] = useState(kept[name] ? kept[name].data : null)
  useEffect(() => {
    if (!supabase || !session) return undefined
    ;(subs[name] ||= new Set()).add(setV)
    if (!kept[name] || Date.now() - kept[name].at > AGAIN_MS[name]) ask(name)
    const t = setInterval(() => ask(name), AGAIN_MS[name])
    return () => { subs[name].delete(setV); clearInterval(t) }
  }, [session, name])
  return session ? v : null
}

/** { at, places: { home, kordyak, ruble, soar } } from our stations, or { error }, or null while asking. */
export const useStations = () => useOutside('stations')
/** { at, species: [...] } from eBird, or { error }, or null while asking. */
export const useBirds = () => useOutside('birds')
/** { at, hotspots, county, possible } from eBird, or { error }, or null while asking. */
export const useBirdsMore = () => useOutside('birds-more')
/** Where one bird was last seen near us: { sightings: [...] } or { error }. Asked when a bird is opened. */
export async function askNearest(code) {
  const { data, error } = await supabase.functions.invoke('birds', { body: { kind: 'nearest', code } })
  return outsideProblem({ error, data, online: typeof navigator === 'undefined' || navigator.onLine !== false }) || data
}

/** { at, pictures: { [season id]: { url, page, credit } } } from the wild function, or { error }, or null while asking. */
export const useWildPictures = () => useOutside('wild')
