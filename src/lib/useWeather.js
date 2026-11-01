import { useEffect, useState } from 'react'
import { forecastUrl, alertsUrl, shapeForecast, shapeAlerts, placeNowUrl, shapePlaceNow, placesNowUrl, shapePlacesNow } from './weather.js'
import { HOME_TOWN } from './sky.js'

const KEEP_MS = 15 * 60 * 1000 // the forecast changes hourly; asking every quarter hour is plenty
const KEY = 'teamhicks.weather'
const localIso = () => new Intl.DateTimeFormat('sv-SE', { timeZone: HOME_TOWN.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T')

async function load() {
  try { const kept = JSON.parse(sessionStorage.getItem(KEY)); if (kept && Date.now() - kept.at < KEEP_MS) return kept } catch { /* nothing kept */ }
  const [f, a] = await Promise.allSettled([
    fetch(forecastUrl()).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
    fetch(alertsUrl(), { headers: { Accept: 'application/geo+json' } }).then((r) => (r.ok ? r.json() : null)),
  ])
  if (f.status !== 'fulfilled') throw new Error('The forecast couldn’t be reached just now.')
  const out = { at: Date.now(), forecast: f.value, alerts: a.status === 'fulfilled' ? a.value : null }
  try { sessionStorage.setItem(KEY, JSON.stringify(out)) } catch { /* fine */ }
  return out
}

/** The forecast and alerts at home: { forecast, alerts, error }, refreshed every quarter hour. */
export function useWeather() {
  const [state, setState] = useState({ forecast: null, alerts: [], error: null })
  useEffect(() => {
    let live = true
    const run = () => load().then((d) => { if (live) setState({ forecast: shapeForecast(d.forecast, localIso()), alerts: shapeAlerts(d.alerts), error: null }) })
      .catch((e) => { if (live) setState((s) => ({ ...s, error: e.message })) })
    run()
    const t = setInterval(run, KEEP_MS)
    return () => { live = false; clearInterval(t) }
  }, [])
  return state
}

/** Right now at one of our places: { now, error }, kept for a quarter hour. */
export function usePlaceWeather(place) {
  const [state, setState] = useState({ now: null, error: null })
  const slug = place ? place.slug : null
  useEffect(() => {
    if (!place) return
    let live = true
    const key = KEY + '.' + place.slug
    const run = async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept || Date.now() - kept.at > KEEP_MS) {
          const r = await fetch(placeNowUrl(place))
          if (!r.ok) throw new Error(String(r.status))
          kept = { at: Date.now(), json: await r.json() }
          try { sessionStorage.setItem(key, JSON.stringify(kept)) } catch { /* fine */ }
        }
        if (live) setState({ now: shapePlaceNow(kept.json), error: null })
      } catch { if (live) setState({ now: null, error: 'The weather there couldn’t be reached just now.' }) }
    }
    setState({ now: null, error: null })
    run()
    return () => { live = false }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

/**
 * Right now at many places, in one request: { [slug]: weather }, kept for a
 * quarter hour. Places at the same point (home and a school in one town) are
 * asked once.
 */
export function usePlacesWeather(places) {
  const [state, setState] = useState({})
  const ids = places.map((p) => p.slug).sort().join(',')
  useEffect(() => {
    if (!places.length) return undefined
    let live = true
    const key = KEY + '.many.' + ids
    const points = []
    const at = {}
    for (const p of places) { const k = p.lat.toFixed(3) + ',' + p.lng.toFixed(3); if (!(k in at)) { at[k] = points.length; points.push({ slug: k, lat: p.lat, lng: p.lng }) } }
    const run = async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept || Date.now() - kept.at > KEEP_MS) {
          const r = await fetch(placesNowUrl(points))
          if (!r.ok) throw new Error(String(r.status))
          kept = { at: Date.now(), json: await r.json() }
          try { sessionStorage.setItem(key, JSON.stringify(kept)) } catch { /* fine */ }
        }
        const byPoint = shapePlacesNow(kept.json, points)
        const out = {}
        for (const p of places) { const w = byPoint[p.lat.toFixed(3) + ',' + p.lng.toFixed(3)]; if (w) out[p.slug] = w }
        if (live) setState(out)
      } catch { if (live) setState({}) }
    }
    run()
    const t = setInterval(run, KEEP_MS)
    return () => { live = false; clearInterval(t) }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

const wallIso = (tz) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T')

/** The whole forecast at one of our places, in its own time: { forecast, error }, kept for a quarter hour. */
export function usePlaceForecast(place) {
  const [state, setState] = useState({ forecast: null, error: null })
  const slug = place ? place.slug : null
  useEffect(() => {
    if (!place) return undefined
    let live = true
    const key = KEY + '.forecast.' + place.slug
    const run = async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept || Date.now() - kept.at > KEEP_MS) {
          const r = await fetch(forecastUrl({ lat: place.lat, lng: place.lng, tz: place.tz }))
          if (!r.ok) throw new Error(String(r.status))
          kept = { at: Date.now(), json: await r.json() }
          try { sessionStorage.setItem(key, JSON.stringify(kept)) } catch { /* fine */ }
        }
        if (live) setState({ forecast: shapeForecast(kept.json, wallIso(place.tz)), error: null })
      } catch { if (live) setState({ forecast: null, error: 'The weather there couldn’t be reached just now.' }) }
    }
    setState({ forecast: null, error: null })
    run()
    const t = setInterval(run, KEEP_MS)
    return () => { live = false; clearInterval(t) }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}
