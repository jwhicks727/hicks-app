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
  const { data, error } = await supabase.functions.invoke(FUNCTION[name] || name, { body: BODY[name] || bodyFor(name) })
  asking[name] = false
  const v = outsideProblem({ error, data, online: typeof navigator === 'undefined' || navigator.onLine !== false }) || data
  kept[name] = { data: v, at: Date.now() }
  ;(subs[name] || new Set()).forEach((f) => f(v))
}

// Names made on the fly: `birds-near:<lat>,<lng>`, a tenth-of-a-degree cell away from home.
const NEAR = /^birds-near:(-?\d{1,2}\.\d),(-?\d{1,3}\.\d)$/
function bodyFor(name) {
  const m = NEAR.exec(name)
  return m ? { kind: 'near', lat: Number(m[1]), lng: Number(m[2]) } : {}
}
const againFor = (name) => AGAIN_MS[name] || 60 * 60e3 // a place away from home: hourly, as at home

function useOutside(name) {
  const session = useSession()
  const [v, setV] = useState(name && kept[name] ? kept[name].data : null)
  useEffect(() => {
    if (!supabase || !session || !name) return undefined
    setV(kept[name] ? kept[name].data : null)
    ;(subs[name] ||= new Set()).add(setV)
    if (!kept[name] || Date.now() - kept[name].at > againFor(name)) ask(name)
    const t = setInterval(() => ask(name), againFor(name))
    return () => { subs[name].delete(setV); clearInterval(t) }
  }, [session, name])
  return session && name ? v : null
}

/**
 * The cell a point away from home falls in, for the birds function: a tenth
 * of a degree (about ten kilometres), the most it is ever told.
 */
export const nearCellName = (point) => (point && Number.isFinite(point.lat) && Number.isFinite(point.lng) ? `birds-near:${(Math.round(point.lat * 10) / 10).toFixed(1)},${(Math.round(point.lng * 10) / 10).toFixed(1)}` : null)
/** The birds where we are, away from home: { at, cell, species, sample, hotspots } or { error }, or null while asking (or with no point). */
export const useBirdsNear = (point) => useOutside(nearCellName(point))

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
