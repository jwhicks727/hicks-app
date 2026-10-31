import { useEffect, useState } from 'react'
import { forecastUrl, alertsUrl, shapeForecast, shapeAlerts } from './weather.js'
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
