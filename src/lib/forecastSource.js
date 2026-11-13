// ============================================
// forecastSource.js -- ask for a forecast, and never wait forever
// ============================================
// 1. Open-Meteo (the full forecast: three weeks back, sixteen days ahead, UV,
//    clouds, rain amounts), 2. if it can't be reached in time or sends
//    something that isn't a forecast, the National Weather Service's hourly
//    forecast (src/lib/nws.js; the United States only, less detail).
// Every request has a timeout: a request that just hangs used to leave the
// weather card on "Looking at the sky…" for good.

import { forecastUrl } from './weather.js'
import { nwsPointUrl, hourlyUrlFrom, nwsToForecast } from './nws.js'

export const TIMEOUT_MS = 8000

/** fetch + json, failing with a plain Error after `timeout` ms, on a bad status, or on an answer that isn't JSON. */
export async function getJson(url, { timeout = TIMEOUT_MS, headers, fetchFn = (...a) => fetch(...a) } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetchFn(url, { headers, signal: ctl.signal })
    if (!r.ok) throw new Error(`status ${r.status}`)
    return await r.json()
  } catch (e) {
    throw ctl.signal.aborted ? new Error('timed out') : e
  } finally { clearTimeout(timer) }
}

/** Does this look like an Open-Meteo forecast the screens can read? (A reading that doesn't look right is never used.) */
export function isForecast(j) {
  return Boolean(j && j.current && typeof j.current.temperature_2m === 'number' && j.hourly && Array.isArray(j.hourly.time) && j.hourly.time.length > 0 && j.daily && Array.isArray(j.daily.time) && j.daily.time.length > 0)
}

const grids = new Map() // a point's hourly-forecast address and time zone never change
const ZONE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/

async function nwsForecast(point, opts) {
  const k = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
  let g = grids.get(k)
  if (!g) {
    const pts = await getJson(nwsPointUrl(point), { ...opts, headers: { Accept: 'application/geo+json' } })
    const url = hourlyUrlFrom(pts), zone = pts && pts.properties && pts.properties.timeZone
    if (!url || typeof zone !== 'string' || !ZONE.test(zone)) throw new Error('no hourly forecast there')
    g = { url, tz: zone }
    grids.set(k, g)
  }
  return { json: await getJson(g.url, { ...opts, headers: { Accept: 'application/geo+json' } }), tz: !point.tz || point.tz === 'auto' ? g.tz : point.tz }
}

/**
 * The forecast at { lat, lng, tz }: { json, source: 'open-meteo' | 'nws' }, in
 * Open-Meteo's shape either way. Throws only when both sources have failed.
 * `backup: false` asks Open-Meteo alone.
 */
export async function loadForecast(point, { past = 0, days = 7, backup = true, ...opts } = {}) {
  let first
  try {
    const json = await getJson(forecastUrl({ lat: point.lat, lng: point.lng, tz: point.tz, past, days }), opts)
    if (!isForecast(json)) throw new Error('not a forecast')
    return { json, source: 'open-meteo' }
  } catch (e) { first = e }
  if (!backup) throw first
  try {
    const got = await nwsForecast(point, opts)
    const json = nwsToForecast(got.json, { lat: point.lat, lng: point.lng, tz: got.tz })
    if (!isForecast(json)) throw new Error('not a forecast')
    return { json, source: 'nws' }
  } catch { throw first }
}
