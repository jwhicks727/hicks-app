import { useEffect, useState } from 'react'
import { forecastUrl, alertsUrl, shapeForecast, shapeAlerts, placeNowUrl, shapePlaceNow } from './weather.js'
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
