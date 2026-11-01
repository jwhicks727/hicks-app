// ============================================
// birdStats.js -- Laurie's sightings, looked at by bird, day, month and place
// ============================================
// Pure: tests/life-list.test.mjs. Rows are bird_sightings rows (species,
// sci_name, count, observed_on, location, location_id, state, county,
// submission_id, ...). A bird's "first" is the earliest day she saw it: her
// lifer. Species are told apart by their scientific name (else common name).

export const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
export const speciesKey = (r) => slug(r.sci_name || r.species)
/** A place's key: eBird's own location id, else its name. */
export const placeKey = (r) => slug(r.location_id || r.location) || 'somewhere'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthName = (m) => MONTHS[m - 1] || ''

const byDate = (a, b) => (a.observed_on < b.observed_on ? -1 : a.observed_on > b.observed_on ? 1 : String(a.observed_time || '').localeCompare(String(b.observed_time || '')))

/**
 * Every species she has seen: [{ key, species, sci, order, first: { date, location, submission }, last, days, checklists, best, total }],
 * in the order birders keep them (taxonomic), or by when she first saw each (`by: 'first'`, newest first).
 * Birds that eBird records only to a group ("sparrow sp.", "Bird sp.", hybrids) aren't species, so they aren't counted.
 */
export function lifeList(rows, by = 'order') {
  const map = new Map()
  for (const r of rows) {
    if (/\bsp\.|\/|\bx\b|\(hybrid\)|\bslash\b/i.test(r.species)) continue
    const k = speciesKey(r)
    let e = map.get(k)
    if (!e) { e = { key: k, species: r.species, sci: r.sci_name, order: r.taxon_order ?? 1e9, first: null, last: null, dayset: new Set(), checklists: new Set(), best: 0, total: 0, media: false }; map.set(k, e) }
    e.dayset.add(r.observed_on); e.checklists.add(r.submission_id)
    if (r.count != null) { e.best = Math.max(e.best, r.count); e.total += r.count }
    e.media ||= Boolean(r.has_media)
    if (!e.first || r.observed_on < e.first.date) e.first = { date: r.observed_on, location: r.location, submission: r.submission_id, locId: placeKey(r) }
    if (!e.last || r.observed_on > e.last.date) e.last = { date: r.observed_on, location: r.location, submission: r.submission_id, locId: placeKey(r) }
  }
  const list = [...map.values()].map(({ dayset, checklists, ...e }) => ({ ...e, days: dayset.size, checklists: checklists.size }))
  return by === 'first' ? list.sort((a, b) => (a.first.date < b.first.date ? 1 : a.first.date > b.first.date ? -1 : a.order - b.order)) : list.sort((a, b) => a.order - b.order || a.species.localeCompare(b.species))
}

/** New birds since a date (her lifers on or after it), newest first. */
export const newBirds = (rows, since) => lifeList(rows, 'first').filter((b) => b.first.date >= since)

/** Each day she birded, newest first: { date, species, checklists, places, lifers }. */
export function byDay(rows) {
  const lifers = new Map(lifeList(rows).map((b) => [b.key, b.first.date]))
  const days = new Map()
  for (const r of rows) {
    let d = days.get(r.observed_on)
    if (!d) { d = { date: r.observed_on, spec: new Set(), lists: new Set(), places: new Set(), lifers: new Set() }; days.set(r.observed_on, d) }
    const k = speciesKey(r)
    if (!/\bsp\.|\/|\bx\b/i.test(r.species)) d.spec.add(k)
    d.lists.add(r.submission_id); d.places.add(r.location || placeKey(r))
    if (lifers.get(k) === r.observed_on) d.lifers.add(k)
  }
  return [...days.values()].map((d) => ({ date: d.date, species: d.spec.size, checklists: d.lists.size, places: [...d.places], lifers: d.lifers.size })).sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** What she saw on one day: [{ key, species, count, time, location, submission }] in the order she saw them. */
export function dayList(rows, date) {
  return rows.filter((r) => r.observed_on === date).sort(byDate).map((r) => ({ key: speciesKey(r), species: r.species, count: r.count, time: r.observed_time, location: r.location, submission: r.submission_id, comments: r.comments, media: r.has_media }))
}

/** The twelve months across every year: { month, name, species, checklists, years, days } (months she never birded still appear, empty). */
export function byMonth(rows) {
  const out = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, name: MONTHS[i], spec: new Set(), lists: new Set(), years: new Set(), days: new Set() }))
  for (const r of rows) {
    const m = out[Number(r.observed_on.slice(5, 7)) - 1]
    if (!m) continue
    if (!/\bsp\.|\/|\bx\b/i.test(r.species)) m.spec.add(speciesKey(r))
    m.lists.add(r.submission_id); m.years.add(r.observed_on.slice(0, 4)); m.days.add(r.observed_on)
  }
  return out.map((m) => ({ month: m.month, name: m.name, species: m.spec.size, checklists: m.lists.size, years: m.years.size, days: m.days.size }))
}

/** The birds of one month, any year: [{ key, species, days, best, lastSeen }], most days first. */
export function monthList(rows, month) {
  const mm = String(month).padStart(2, '0'), map = new Map()
  for (const r of rows) {
    if (r.observed_on.slice(5, 7) !== mm || /\bsp\.|\/|\bx\b/i.test(r.species)) continue
    const k = speciesKey(r); let e = map.get(k)
    if (!e) { e = { key: k, species: r.species, dayset: new Set(), best: 0, lastSeen: r.observed_on }; map.set(k, e) }
    e.dayset.add(r.observed_on); e.best = Math.max(e.best, r.count || 0); if (r.observed_on > e.lastSeen) e.lastSeen = r.observed_on
  }
  return [...map.values()].map(({ dayset, ...e }) => ({ ...e, days: dayset.size })).sort((a, b) => b.days - a.days || a.species.localeCompare(b.species))
}

/** Every place she has birded: { key, name, state, county, species, checklists, days, last, lifers }, most species first. */
export function byPlace(rows) {
  const lifers = new Map(lifeList(rows).map((b) => [b.key, b.first.locId]))
  const map = new Map()
  for (const r of rows) {
    const k = placeKey(r); let e = map.get(k)
    if (!e) { e = { key: k, name: r.location || 'A place with no name', state: r.state, county: r.county, spec: new Set(), lists: new Set(), days: new Set(), last: r.observed_on, lifers: new Set() }; map.set(k, e) }
    if (!/\bsp\.|\/|\bx\b/i.test(r.species)) { e.spec.add(speciesKey(r)); if (lifers.get(speciesKey(r)) === k) e.lifers.add(speciesKey(r)) }
    e.lists.add(r.submission_id); e.days.add(r.observed_on); if (r.observed_on > e.last) e.last = r.observed_on
  }
  return [...map.values()].map((e) => ({ key: e.key, name: e.name, state: e.state, county: e.county, species: e.spec.size, checklists: e.lists.size, days: e.days.size, last: e.last, lifers: e.lifers.size })).sort((a, b) => b.species - a.species || a.name.localeCompare(b.name))
}

/** One place's birds: [{ key, species, days, best, last }], most days first. */
export function placeList(rows, key) {
  const map = new Map()
  for (const r of rows) {
    if (placeKey(r) !== key || /\bsp\.|\/|\bx\b/i.test(r.species)) continue
    const k = speciesKey(r); let e = map.get(k)
    if (!e) { e = { key: k, species: r.species, dayset: new Set(), best: 0, last: r.observed_on }; map.set(k, e) }
    e.dayset.add(r.observed_on); e.best = Math.max(e.best, r.count || 0); if (r.observed_on > e.last) e.last = r.observed_on
  }
  return [...map.values()].map(({ dayset, ...e }) => ({ ...e, days: dayset.size })).sort((a, b) => b.days - a.days || a.species.localeCompare(b.species))
}

/** One bird's story: its first sighting, every day, the months she sees it (counts of days), and where. */
export function speciesStory(rows, key) {
  const mine = rows.filter((r) => speciesKey(r) === key).sort(byDate)
  if (!mine.length) return null
  const months = Array.from({ length: 12 }, () => 0), places = new Map()
  for (const r of mine) {
    months[Number(r.observed_on.slice(5, 7)) - 1]++
    const k = placeKey(r); const p = places.get(k) || { key: k, name: r.location || 'A place with no name', days: new Set() }; p.days.add(r.observed_on); places.set(k, p)
  }
  return {
    key, species: mine[0].species, sci: mine[0].sci_name, first: mine[0], last: mine[mine.length - 1],
    days: new Set(mine.map((r) => r.observed_on)).size, best: Math.max(0, ...mine.map((r) => r.count || 0)), months,
    places: [...places.values()].map((p) => ({ key: p.key, name: p.name, days: p.days.size })).sort((a, b) => b.days - a.days),
    sightings: mine.slice().reverse().map((r) => ({ date: r.observed_on, time: r.observed_time, count: r.count, location: r.location, submission: r.submission_id, comments: r.comments, media: r.has_media })),
  }
}

/** The totals at the top: { species, checklists, days, places, years, first, last }. */
export function totals(rows) {
  if (!rows.length) return { species: 0, checklists: 0, days: 0, places: 0, years: 0, first: null, last: null }
  const dates = rows.map((r) => r.observed_on).sort()
  return { species: lifeList(rows).length, checklists: new Set(rows.map((r) => r.submission_id)).size, days: new Set(dates).size, places: new Set(rows.map(placeKey)).size, years: new Set(dates.map((d) => d.slice(0, 4))).size, first: dates[0], last: dates[dates.length - 1] }
}

/** The link to a checklist on eBird itself. */
export const checklistUrl = (submission) => (/^S\d+$/.test(submission) ? `https://ebird.org/checklist/${submission}` : null)

/** The birds she saw on this day in other years: [{ year, species: [names] }], the most recent year first. */
export function onThisDay(rows, today) {
  const md = today.slice(5), years = new Map()
  for (const r of rows) {
    if (r.observed_on.slice(5) !== md || r.observed_on.slice(0, 4) === today.slice(0, 4) || /\bsp\.|\/|\bx\b/i.test(r.species)) continue
    const y = r.observed_on.slice(0, 4); const set = years.get(y) || new Set(); set.add(r.species); years.set(y, set)
  }
  return [...years.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([year, set]) => ({ year, species: [...set].sort() }))
}
