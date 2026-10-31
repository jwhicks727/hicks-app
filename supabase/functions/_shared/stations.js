// ============================================
// stations.js -- our chosen weather stations, read through Synoptic
// ============================================
// Plain JavaScript, shared by the `stations` Edge Function and the tests.
// Synoptic's free Open Access tier (non-commercial, public data) reads the
// stations Jason chose: Kordyak SE685, Wayne Ruble 980SE, SOAR NGC08, and
// home's nearest, kept in the family's database and never written here.
// When a station goes quiet, or isn't open to the free tier, its fallback
// (an airport) stands in, and the screen says so.
//
// The answer's shape is Synoptic's documented v2 timeseries: STATION[] each
// with STID, NAME, LATITUDE, LONGITUDE and OBSERVATIONS { date_time[],
// air_temp_set_1[], ... }, plus SUMMARY and UNITS. Unverified against the
// live service from here (the planning sandbox can't reach it).

export const SYNOPTIC = 'https://api.synopticdata.com/v2/stations/timeseries'
export const VARS = ['air_temp', 'relative_humidity', 'wind_speed', 'wind_gust', 'wind_direction', 'precip_accum_since_local_midnight']
export const KEEP_MS = 15 * 60 * 1000 // asked at most every quarter hour, however often the app is opened (about 3,000 asks a month at most)
export const QUIET_MS = 90 * 60 * 1000 // older than this, a station has gone quiet
export const STID = /^[A-Za-z0-9_]{2,16}$/
export const PLACES = ['home', 'kordyak', 'ruble', 'soar']

/** The request for the last day of readings at these stations. */
export function stationsUrl(stids, token) {
  const ids = [...new Set(stids.filter((s) => s && STID.test(s)).map((s) => s.toUpperCase()))]
  const u = new URL(SYNOPTIC)
  u.searchParams.set('stid', ids.join(','))
  u.searchParams.set('recent', '1440')
  u.searchParams.set('vars', VARS.join(','))
  u.searchParams.set('units', 'english,speed|mph')
  u.searchParams.set('token', token)
  return u.toString()
}

const pick = (obs, name) => { const k = Object.keys(obs).find((x) => x.startsWith(name + '_set_')); return k ? obs[k] : null }
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Synoptic's answer as { [STID]: { stid, name, lat, lng, latest, series, quiet } }:
 * the latest reading with a temperature, and the day's temperatures about every 20 minutes.
 */
export function shapeStations(json, nowMs) {
  const out = {}
  const units = (json && json.UNITS) || {}
  const toF = /cel/i.test(units.air_temp || '') ? (c) => c * 9 / 5 + 32 : (f) => f
  const toMph = /knot/i.test(units.wind_speed || '') ? (k) => k * 1.15078 : /m\/s/i.test(units.wind_speed || '') ? (m) => m * 2.23694 : (m) => m
  for (const st of (json && json.STATION) || []) {
    const stid = String(st.STID || '').toUpperCase()
    if (!STID.test(stid)) continue
    const o = st.OBSERVATIONS || {}
    const times = o.date_time || []
    const temp = pick(o, 'air_temp') || [], rh = pick(o, 'relative_humidity') || [], ws = pick(o, 'wind_speed') || [], wg = pick(o, 'wind_gust') || [], wd = pick(o, 'wind_direction') || [], pr = pick(o, 'precip_accum_since_local_midnight') || []
    let last = -1
    for (let i = times.length - 1; i >= 0; i--) if (num(temp[i]) != null) { last = i; break }
    const r1 = (v, f = (x) => x) => (num(v) == null ? null : Math.round(f(v) * 10) / 10)
    const latest = last < 0 ? null : {
      at: Date.parse(times[last]), temp: r1(temp[last], toF), humidity: r1(rh[last]), wind: r1(ws[last], toMph), gust: r1(wg[last], toMph),
      dir: r1(wd[last]), rainToday: r1(pr[last]),
    }
    const series = []
    let kept = -Infinity
    for (let i = 0; i < times.length; i++) {
      const at = Date.parse(times[i]), t = num(temp[i])
      if (t == null || !Number.isFinite(at) || at - kept < 18 * 60000) continue
      series.push({ at, temp: Math.round(toF(t) * 10) / 10 }); kept = at
    }
    out[stid] = { stid, name: String(st.NAME || stid).slice(0, 80), lat: num(Number(st.LATITUDE)), lng: num(Number(st.LONGITUDE)), latest, series, quiet: !latest || nowMs - latest.at > QUIET_MS }
  }
  return out
}

/**
 * Each place's readings, from its own station, or its fallback when that's quiet:
 * { [place]: { source: 'own' | 'fallback', ...station, quietSince } } (null when neither has spoken).
 * Home's station is never named in what's returned: only its readings.
 */
export function choose(rows, shaped) {
  const out = {}
  for (const r of rows || []) {
    if (!PLACES.includes(r.place)) continue
    const own = r.stid ? shaped[String(r.stid).toUpperCase()] : null
    const fb = r.fallback ? shaped[String(r.fallback).toUpperCase()] : null
    let pickd = null
    if (own && !own.quiet) pickd = { source: 'own', ...own }
    else if (fb && !fb.quiet) pickd = { source: 'fallback', ...fb, quietSince: own && own.latest ? own.latest.at : null, ownMissing: !own }
    if (pickd && r.place === 'home') pickd = { source: pickd.source, latest: pickd.latest, series: pickd.series, quiet: pickd.quiet, quietSince: pickd.quietSince || null }
    out[r.place] = pickd
  }
  return out
}

// The words for the screen (warmer or cooler than home, how long ago) are in src/lib/stationWords.js.
