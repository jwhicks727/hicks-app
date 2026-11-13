import { useEffect, useState } from 'react'
import { forecastUrl, alertsUrl, shapeForecast, shapeAlerts, placeNowUrl, shapePlaceNow, placesNowUrl, shapePlacesNow, shapeTimeline, archiveUrl, airUrl, shapeAir, PAST_DAYS, AHEAD_DAYS } from './weather.js'
import { HOME_TOWN } from './sky.js'
import { loadForecast, getJson } from './forecastSource.js'

const KEEP_MS = 15 * 60 * 1000 // the forecast changes hourly; asking every quarter hour is plenty
const KEY = 'teamhicks.weather.v2' // v2: three weeks back and sixteen days ahead, with rain, inches and wind on every hour
const localIso = () => new Intl.DateTimeFormat('sv-SE', { timeZone: HOME_TOWN.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T')

const LAST_KEY = 'teamhicks.weather.last.v1' // the last good home forecast, kept on the device for a few hours
const STALE_MS = 6 * 60 * 60 * 1000
const RETRY_MS = 60 * 1000 // after a failure, try again in a minute rather than waiting a quarter hour

const readLast = () => { try { const k = JSON.parse(localStorage.getItem(LAST_KEY)); return k && k.json && Date.now() - k.at < STALE_MS ? k : null } catch { return null } }

/** The home forecast: { json, source, at }, from this tab's keeping, else Open-Meteo, else the Weather Service. Throws if neither answers. */
async function load() {
  try { const kept = JSON.parse(sessionStorage.getItem(KEY)); if (kept && kept.json && Date.now() - kept.at < KEEP_MS) return kept } catch { /* nothing kept */ }
  const got = await loadForecast(HOME_TOWN, { past: PAST_DAYS, days: AHEAD_DAYS })
  const out = { at: Date.now(), json: got.json, source: got.source }
  try { sessionStorage.setItem(KEY, JSON.stringify(out)) } catch { /* fine */ }
  try { localStorage.setItem(LAST_KEY, JSON.stringify(out)) } catch { /* fine */ }
  return out
}

/** The Weather Service's alerts at home, kept for a quarter hour. They never hold the forecast up: null if they can't be had. */
async function loadAlerts() {
  const key = KEY + '.alerts.home'
  try { const k = JSON.parse(sessionStorage.getItem(key)); if (k && Date.now() - k.at < KEEP_MS) return k.json } catch { /* nothing kept */ }
  const json = await getJson(alertsUrl(), { headers: { Accept: 'application/geo+json' } })
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), json })) } catch { /* fine */ }
  return json
}

/**
 * The forecast and alerts at home: { forecast, alerts, error, stale }, refreshed every quarter hour.
 * `forecast.source` says where it came from ('open-meteo', or 'nws' as the backup). When neither
 * source answers, the last good forecast shows for up to six hours with `stale` set to when it
 * was taken (a time in ms); only with none kept is it an `error`.
 */
export function useWeather() {
  const [state, setState] = useState({ forecast: null, alerts: [], error: null, stale: null })
  useEffect(() => {
    let live = true, timer = null
    const showLast = () => {
      const last = readLast()
      if (last && live) setState((s) => ({ ...s, forecast: shapeForecast(last.json, localIso()), error: null, stale: last.at }))
      return Boolean(last)
    }
    const run = () => {
      load().then((d) => { if (live) setState((s) => ({ ...s, forecast: shapeForecast(d.json, localIso()), error: null, stale: null })); schedule(KEEP_MS) })
        .catch(() => {
          if (!live) return
          if (!showLast()) setState((s) => ({ ...s, error: 'The forecast couldn’t be reached just now. Trying again in a minute.' }))
          schedule(RETRY_MS)
        })
      loadAlerts().then((a) => { if (live) setState((s) => ({ ...s, alerts: shapeAlerts(a) })) }).catch(() => { /* alerts are a bonus */ })
    }
    const schedule = (ms) => { if (live) { clearTimeout(timer); timer = setTimeout(run, ms) } }
    run()
    return () => { live = false; clearTimeout(timer) }
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
          kept = { at: Date.now(), json: await getJson(placeNowUrl(place)) }
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
          kept = { at: Date.now(), json: await getJson(placesNowUrl(points)) }
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
    const key = KEY + '.forecast2.' + place.slug
    const run = async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept || Date.now() - kept.at > KEEP_MS) {
          const got = await loadForecast({ lat: place.lat, lng: place.lng, tz: place.tz }, { past: 2, days: 7 })
          kept = { at: Date.now(), json: got.json.source ? got.json : { ...got.json, source: got.source } }
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

const ago = (date, n) => { const [y, m, d] = date.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10) }
const getKept = async (key, url, ttl = KEEP_MS) => {
  try { const k = JSON.parse(sessionStorage.getItem(key)); if (k && Date.now() - k.at < ttl) return k.json } catch { /* nothing kept */ }
  const json = await getJson(url)
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), json })) } catch { /* fine */ }
  return json
}

/** A forecast (Open-Meteo, else the Weather Service) kept for a quarter hour in this tab; the answer carries its `source`. */
async function keptForecast(key, point, opts) {
  try { const k = JSON.parse(sessionStorage.getItem(key)); if (k && k.json && Date.now() - k.at < KEEP_MS) return k.json } catch { /* nothing kept */ }
  const got = await loadForecast(point, opts)
  const json = got.json.source ? got.json : { ...got.json, source: got.source }
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), json })) } catch { /* fine */ }
  return json
}

/**
 * One day's hours at a point, whichever side of today it falls: from the
 * forecast's loaded window when it holds the day, else the archive (what
 * happened) or the forecast (what's coming, up to sixteen days). Returns
 * { hours, day, source, error, loading }.
 */
export function useDayWeather(date, point = HOME_TOWN, window = null) {
  const [state, setState] = useState({ hours: null, day: null, source: null, error: null, loading: true })
  const inWindow = window && window.allDays.some((d) => d.date === date)
  useEffect(() => {
    let live = true
    if (!/^\d{4}-\d\d-\d\d$/.test(date)) { setState({ hours: null, day: null, source: null, error: 'That isn’t a date.', loading: false }); return undefined }
    if (inWindow) {
      setState({ hours: window.timeline.filter((h) => h.date === date), day: window.allDays.find((d) => d.date === date), source: 'forecast', error: null, loading: false })
      return undefined
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: point.tz || HOME_TOWN.tz }).format(new Date())
    const past = date < today
    if (!past && date > ago(today, AHEAD_DAYS - 1)) { setState({ hours: null, day: null, source: null, error: `The forecast only reaches ${AHEAD_DAYS} days ahead.`, loading: false }); return undefined }
    setState((x) => ({ ...x, loading: true, error: null }))
    const url = past ? archiveUrl({ lat: point.lat, lng: point.lng, tz: point.tz || HOME_TOWN.tz }, date) : forecastUrl({ lat: point.lat, lng: point.lng, tz: point.tz || HOME_TOWN.tz, days: AHEAD_DAYS })
    getKept(`${KEY}.day.${point.lat.toFixed(2)},${point.lng.toFixed(2)}.${date}`, url, past ? 24 * 36e5 : KEEP_MS).then((json) => {
      if (!live) return
      const { timeline, allDays } = shapeTimeline(json, '9999-01-01T00:00')
      const hours = timeline.filter((h) => h.date === date).map((h) => ({ ...h, past: past, now: false }))
      setState({ hours, day: allDays.find((d) => d.date === date) || null, source: past ? 'archive' : 'forecast', error: hours.length ? null : 'No weather was kept for that day.', loading: false })
    }).catch(() => { if (live) setState({ hours: null, day: null, source: null, error: 'The weather for that day couldn’t be reached just now.', loading: false }) })
    return () => { live = false }
  }, [date, inWindow, point.lat, point.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

/** What the weather was on this date a year ago at home: { day } or null. */
export function useYearAgo(date) {
  const [day, setDay] = useState(null)
  useEffect(() => {
    let live = true
    const y = String(Number(date.slice(0, 4)) - 1) + date.slice(4)
    getKept(`${KEY}.yearago.${y}`, archiveUrl(HOME_TOWN, y), 24 * 36e5).then((json) => { if (live) setDay(shapeTimeline(json, '9999-01-01T00:00').allDays[0] ? { ...shapeTimeline(json, '9999-01-01T00:00').allDays[0], year: y.slice(0, 4) } : null) }).catch(() => { if (live) setDay(null) })
    return () => { live = false }
  }, [date])
  return day
}

/** The air at a point: { air, error }, kept for half an hour. */
export function useAir(point = HOME_TOWN) {
  const [state, setState] = useState({ air: null, error: null })
  useEffect(() => {
    let live = true
    getKept(`${KEY}.air.${point.lat.toFixed(2)},${point.lng.toFixed(2)}`, airUrl({ lat: point.lat, lng: point.lng, tz: point.tz || HOME_TOWN.tz }), 2 * KEEP_MS)
      .then((json) => { if (live) setState({ air: shapeAir(json), error: null }) })
      .catch(() => { if (live) setState({ air: null, error: 'The air quality couldn’t be reached just now.' }) })
    return () => { live = false }
  }, [point.lat, point.lng])
  return state
}

/** The Weather Service's alerts at a point (the United States only). */
export function useAlertsAt(point = HOME_TOWN) {
  const [alerts, setAlerts] = useState([])
  useEffect(() => {
    let live = true
    getKept(`${KEY}.alerts.${point.lat.toFixed(2)},${point.lng.toFixed(2)}`, alertsUrl(point)).then((json) => { if (live) setAlerts(shapeAlerts(json)) }).catch(() => { if (live) setAlerts([]) })
    return () => { live = false }
  }, [point.lat, point.lng])
  return alerts
}

/**
 * The forecast where the phone is (a point already rounded to about a
 * kilometre, src/lib/here.js), in that place's own time zone, which Open-Meteo
 * works out: { forecast, tz, elevation (metres), error }, kept for a quarter hour.
 */
export function useHereForecast(point) {
  const [state, setState] = useState({ forecast: null, tz: null, elevation: null, error: null })
  const at = point ? `${point.lat.toFixed(2)},${point.lng.toFixed(2)}` : null
  useEffect(() => {
    if (!point) { setState({ forecast: null, tz: null, elevation: null, error: null }); return undefined }
    let live = true
    const run = () => keptForecast(`${KEY}.here2.${at}`, { lat: point.lat, lng: point.lng, tz: 'auto' }, { past: 1, days: 7 })
      .then((json) => {
        if (!live) return
        const tz = typeof json.timezone === 'string' && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$|^UTC$/.test(json.timezone) ? json.timezone : HOME_TOWN.tz
        setState({ forecast: shapeForecast(json, wallIso(tz)), tz, elevation: typeof json.elevation === 'number' && Number.isFinite(json.elevation) ? json.elevation : null, error: null })
      })
      .catch(() => { if (live) setState((s) => ({ ...s, error: 'The weather here couldn’t be reached just now.' })) })
    run()
    const t = setInterval(run, KEEP_MS)
    return () => { live = false; clearInterval(t) }
  }, [at]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}
