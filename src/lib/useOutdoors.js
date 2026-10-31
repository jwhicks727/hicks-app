import { useEffect, useState } from 'react'
import { tripForecastUrl, pastYearsUrls, summarizePast, sightingsUrl, shapeSightings } from './outdoors.js'
import { conditions } from './weather.js'
import { diffDays } from './cal/dates.js'

const kept = new Map()
async function getJson(url) {
  if (kept.has(url)) return kept.get(url)
  try { const s = sessionStorage.getItem('teamhicks.o.' + url); if (s) { const v = JSON.parse(s); kept.set(url, v); return v } } catch { /* nothing kept */ }
  const r = await fetch(url)
  if (!r.ok) throw new Error(String(r.status))
  const v = await r.json()
  kept.set(url, v)
  try { sessionStorage.setItem('teamhicks.o.' + url, JSON.stringify(v)) } catch { /* too big to keep: fine */ }
  return v
}

/** The weather at an outdoor event's place: the forecast within 16 days, else the same dates in past years. */
export function usePlaceWeather(ev, today) {
  const [state, setState] = useState({ kind: null, days: null, past: null, error: null })
  useEffect(() => {
    let live = true
    if (!ev || ev.lat == null) return undefined
    const to = ev.ends_on > ev.starts_on && diffDays(ev.starts_on, ev.ends_on) > 13 ? null : ev.ends_on
    const end = to || ev.starts_on
    if (ev.ends_on < today) { setState({ kind: 'past', days: null, past: null, error: null }); return undefined }
    if (diffDays(today, ev.starts_on) <= 15) {
      getJson(tripForecastUrl(ev.lat, ev.lng, ev.starts_on < today ? today : ev.starts_on, diffDays(today, end) > 15 ? undefined : end)).then((j) => {
        const d = j.daily
        if (live) setState({ kind: 'forecast', past: null, error: null, days: d.time.map((t, i) => ({ date: t, high: Math.round(d.temperature_2m_max[i]), low: Math.round(d.temperature_2m_min[i]), rain: d.precipitation_probability_max?.[i] ?? null, gusts: Math.round(d.wind_gusts_10m_max?.[i] ?? 0), uv: d.uv_index_max?.[i] ?? null, sunrise: d.sunrise?.[i], sunset: d.sunset?.[i], ...conditions(d.weather_code[i]) })) })
      }).catch(() => { if (live) setState({ kind: 'forecast', days: null, past: null, error: 'The forecast couldn’t be reached just now.' }) })
    } else {
      Promise.all(pastYearsUrls(ev.lat, ev.lng, ev.starts_on, end, Number(today.slice(0, 4))).map((u) => getJson(u).catch(() => null)))
        .then((answers) => { if (live) setState({ kind: 'past', days: null, past: summarizePast(answers), error: null }) })
    }
    return () => { live = false }
  }, [ev, today])
  return state
}

/** What iNaturalist's observers have seen near a place in a month: one group at a time. */
export function useSightings(ev, taxon) {
  const [state, setState] = useState({ list: null, error: null })
  useEffect(() => {
    let live = true
    if (!ev || ev.lat == null) return undefined
    setState({ list: null, error: null })
    getJson(sightingsUrl(ev.lat, ev.lng, Number(ev.starts_on.slice(5, 7)), taxon))
      .then((j) => { if (live) setState({ list: shapeSightings(j), error: null }) })
      .catch(() => { if (live) setState({ list: null, error: 'iNaturalist couldn’t be reached just now.' }) })
    return () => { live = false }
  }, [ev, taxon])
  return state
}
