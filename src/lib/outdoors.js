// ============================================
// outdoors.js -- an outdoor event's place: its weather, what's been seen
// there, and its nights. Pure: tests/outdoors.test.mjs runs it on saved
// answers. The browser asks Open-Meteo (weather, finding a place) and
// iNaturalist (sightings), each with the place's coordinates rounded to two
// places (about a kilometre), never anyone's address.
// ============================================

const OUTDOORS = /\b(camp(ing|out|ground|site)?|hike|hiking|trail|trailhead|beach|park|picnic|lake|canyon|bird(ing|walk)?|big day|ski(ing)?|snowboard|kayak|canoe|paddle|fish(ing)?|garden|preserve|reserve|forest|mountain|summit|desert|dunes|falls|hot springs|national|state park|backpack|climb(ing)?|stargaz|star party|tide ?pools?|whale|bike ride|ride|run|marathon|5k|10k|zoo|botanic)/i
/** Is this event likely outdoors, from its words? A suggestion; the form's switch decides. */
export const looksOutdoors = (title, place = '') => OUTDOORS.test(`${title} ${place}`)

const r2 = (x) => Math.round(x * 100) / 100

export function geocodeUrl(name) {
  return `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: String(name).slice(0, 100), count: '6', language: 'en', format: 'json', countryCode: '' }).toString().replace('&countryCode=', '')}`
}
/** Open-Meteo's places, shaped: [{ name, where, lat, lng }] */
export function shapePlaces(json) {
  return (json?.results || []).slice(0, 6).map((p) => ({ name: p.name, where: [p.admin1, p.country_code === 'US' ? null : p.country].filter(Boolean).join(', '), lat: r2(p.latitude), lng: r2(p.longitude) }))
}

export function tripForecastUrl(lat, lng, from, to) {
  return `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
    latitude: String(r2(lat)), longitude: String(r2(lng)), start_date: from, end_date: to, timezone: 'auto',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
  })}`
}
/** The same dates in each of the last `years` years, for what the weather is usually like. */
export function pastYearsUrls(lat, lng, from, to, thisYear, years = 5) {
  const shift = (d, n) => `${Number(d.slice(0, 4)) - n}${d.slice(4)}`.replace(/-02-29$/, '-02-28')
  // The event's dates in each year before it, never in a year still to come.
  const firstBack = Math.max(1, Number(to.slice(0, 4)) - thisYear)
  return Array.from({ length: years }, (_, i) => `https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
    latitude: String(r2(lat)), longitude: String(r2(lng)), start_date: shift(from, firstBack + i), end_date: shift(to, firstBack + i),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', temperature_unit: 'fahrenheit', precipitation_unit: 'inch', timezone: 'auto',
  })}`)
}
/** What those past years add up to: { high: [lo, hi], low: [lo, hi], wetDays, days, years } */
export function summarizePast(answers) {
  const highs = [], lows = []; let wet = 0, days = 0
  for (const a of answers) {
    const d = a && a.daily; if (!d) continue
    d.temperature_2m_max.forEach((t, i) => { if (t == null) return; days++; highs.push(t); lows.push(d.temperature_2m_min[i]); if ((d.precipitation_sum[i] || 0) >= 0.04) wet++ })
  }
  if (!days) return null
  const range = (xs) => [Math.round(Math.min(...xs)), Math.round(Math.max(...xs))]
  return { high: range(highs), low: range(lows), wetDays: wet, days, years: answers.filter((a) => a && a.daily).length }
}

export const SIGHTING_GROUPS = [['Aves', 'Birds'], ['Mammalia', 'Mammals'], ['Plantae', 'Plants'], ['Reptilia', 'Reptiles'], ['Insecta', 'Insects']]
export function sightingsUrl(lat, lng, month, taxon = 'Aves', radiusKm = 12) {
  return `https://api.inaturalist.org/v1/observations/species_counts?${new URLSearchParams({ lat: String(r2(lat)), lng: String(r2(lng)), radius: String(radiusKm), month: String(month), iconic_taxa: taxon, quality_grade: 'research', per_page: '12', locale: 'en' })}`
}
/** iNaturalist's species counts, shaped: [{ id, name, scientific, count, photo, credit, url }] */
export function shapeSightings(json) {
  return (json?.results || []).filter((r) => r.taxon && r.taxon.id).slice(0, 12).map((r) => {
    const t = r.taxon, ph = t.default_photo || null
    return {
      id: t.id, name: String(t.preferred_common_name || t.name).slice(0, 80), scientific: String(t.name).slice(0, 80), count: r.count,
      photo: ph && /^https:\/\//.test(ph.medium_url || ph.square_url || '') ? (ph.medium_url || ph.square_url) : null,
      credit: ph ? String(ph.attribution || '').slice(0, 160) : '', url: `https://www.inaturalist.org/taxa/${Number(t.id)}`,
    }
  })
}
export const exploreUrl = (lat, lng, month) => `https://www.inaturalist.org/observations?lat=${r2(lat)}&lng=${r2(lng)}&radius=12&month=${month}&subview=grid`
