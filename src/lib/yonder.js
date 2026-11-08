// ============================================
// yonder.js -- the travel app: trips, packing, stamps, our day, the sky, abroad
// ============================================
// Pure, so tests/yonder.test.mjs runs it in Node. A trip is a calendar event
// with a place away from home, or one of Life List's outings someone kept, or
// today away (unkept until someone keeps it). Everything shown comes from real
// data: the calendar, the forecast, the guide, the sky worked out on the phone.

import { miles, AWAY_MI, placeWords } from './here.js'
import { addDays, diffDays, WEEKDAYS } from './cal/dates.js'
import { lifeList } from './life/birdStats.js'
import { startBy } from './around.js'

export const APP_NAMES = ['Yonder', 'Postcards', 'Field Trip', 'Wayfaring', 'Wanderings']
export const appNameOf = (s) => (s && APP_NAMES.includes(s.app_name) ? s.app_name : 'Yonder')
const firstPart = (s) => String(s || '').split(',')[0].trim()

/** The trip we're on today: a calendar trip, a kept outing, or today away. Null at home with nothing on. */
export function currentTrip({ events = [], outings = [], here = null, today, home }) {
  const ev = events.find((e) => e && e.lat != null && e.lng != null && e.starts_on <= today && e.ends_on >= today && miles(home, e) > AWAY_MI)
  if (ev) {
    const kept = outings.find((o) => o.event_id === ev.id)
    return { title: ev.title, place: ev.place || '', town: firstPart(ev.place) || ev.title, starts_on: ev.starts_on, ends_on: ev.ends_on, event_id: ev.id, outing_id: kept ? kept.id : null, lat: ev.lat, lng: ev.lng }
  }
  const o = outings.find((x) => x && x.starts_on <= today && x.ends_on >= today && x.kind !== 'outing')
  if (o) return { title: o.title, place: o.place || '', town: firstPart(o.place) || o.title, starts_on: o.starts_on, ends_on: o.ends_on, event_id: o.event_id || null, outing_id: o.id }
  if (here && here.tier === 'away') {
    const town = (here.town && here.town.town) || (here.place && here.place.town)
    if (town) return { title: town, place: placeWords(here.town) || town, town, starts_on: today, ends_on: today, event_id: null, outing_id: null }
  }
  return null
}

/** The next trip on the calendar, within two months: soonest first, with how many sleeps. */
export function nextTrip(events, today, home, within = 60) {
  const last = addDays(today, within)
  const t = (events || []).filter((e) => e && e.lat != null && e.lng != null && e.starts_on > today && e.starts_on <= last && miles(home, e) > AWAY_MI)
    .sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))[0]
  return t ? { ...t, town: firstPart(t.place) || t.title, sleeps: diffDays(today, t.starts_on) } : null
}
/** "4 sleeps until Big Bear", "1 sleep until Big Bear". */
export const sleepsWords = (t) => `${t.sleeps} ${t.sleeps === 1 ? 'sleep' : 'sleeps'} until ${t.town}`

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
/** "Your fourth time in Big Bear. Last time: February 2026." or "Your first time in Sedona." From kept trips only. */
export function visitsWords(outings, town, today, exceptId = null) {
  const t = norm(town)
  if (!t) return ''
  const before = (outings || []).filter((o) => o.id !== exceptId && o.ends_on < today && norm(`${o.title} ${o.place || ''}`).includes(t)).sort((a, b) => (a.ends_on < b.ends_on ? 1 : -1))
  if (!before.length) return `Your first time in ${town}.`
  const n = before.length + 1
  const last = new Date(before[0].starts_on + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return `Your ${ORD[n - 1] || `${n}th`} time in ${town}. Last time: ${last}.`
}

/**
 * Packing suggestions from the trip itself: the forecast for its days, the plan (a guide
 * with hikes), and who's coming (the event's own words or its person). One tap adds one;
 * our own items always come first on the list.
 */
export function packingSuggestions({ days = [], hikes = false, words = '', forWhom = null }) {
  const out = []
  const low = days.length ? Math.min(...days.map((d) => d.low)) : null
  const high = days.length ? Math.max(...days.map((d) => d.high)) : null
  if (days.some((d) => [71, 73, 75, 77, 85, 86].includes(d.code))) out.push('Snow boots')
  if (low != null && low <= 32) out.push('Warm coats, hats and gloves')
  else if (low != null && low <= 45) out.push('Warm layers for the evenings')
  if (high != null && high >= 90) out.push('Sun hats and big water bottles')
  if (days.some((d) => (d.rain ?? 0) >= 50 || (d.inches ?? 0) >= 0.1)) out.push('Rain jackets')
  if (days.some((d) => (d.uv ?? 0) >= 7)) out.push('Sunscreen')
  if (hikes) out.push('Hiking shoes and a daypack')
  const w = norm(words)
  if (/\b(appa|dog)\b/.test(w)) out.push('Appa’s lead, bowl and food')
  if (/\bbird/.test(w) || !forWhom) out.push('Binoculars')
  if (!forWhom) out.push('Laurie’s paints and sketchbook', 'Anna’s sketchbook and pencils')
  return [...new Set(out)]
}

/** The kind of stamp a kept trip gets in the passport, from what it was. */
export function stampKind(o) {
  if (o.park) return 'park'
  if (o.kind === 'disneyland') return 'castle'
  if (o.kind === 'camping') return 'camp'
  const t = norm(`${o.title} ${o.place || ''}`)
  if (/\b(beach|coast|bay|ocean|island|harbor|harbour|pier|kona)\b/.test(t)) return 'coast'
  if (/\blake\b/.test(t)) return 'lake'
  if (/\b(desert|joshua|palm springs|death valley|dunes|mojave|sedona)\b/.test(t)) return 'desert'
  if (/\b(mountain|mountains|peak|big bear|forest|canyon|ski|pines|yosemite)\b/.test(t)) return 'mountain'
  if (/\b(new york|paris|city|washington|beijing|san francisco|los angeles|chicago|london)\b/.test(t)) return 'city'
  return 'town'
}
export const STAMP_COLOURS = { park: '#4E6C3D', castle: '#C14D83', camp: '#8A5A33', coast: '#2C6E9E', lake: '#2F7D7A', desert: '#C9863F', mountain: '#5A4E8A', city: '#5A6B7A', town: '#B3401A' }

/** Hikes done on a trip: { count, miles, climb }. */
export function hikeTotals(hikes) {
  return (hikes || []).reduce((t, h) => ({ count: t.count + 1, miles: Math.round((t.miles + Number(h.miles || 0)) * 10) / 10, climb: t.climb + Number(h.climb_ft || 0) }), { count: 0, miles: 0, climb: 0 })
}
/** Is this the longest hike any of us has ticked off? (Something wonderful: the rainbow gleam.) */
export const longestYet = (hikes, m) => Number(m) > 0 && (hikes || []).every((h) => Number(h.miles || 0) < Number(m))

/** Laurie's lifers on a trip: birds she first recorded between its first and last day. */
export const tripLifers = (rows, from, to) => lifeList(rows || [], 'first').filter((b) => b.first.date >= from && b.first.date <= to)

/** Trips kept in other years that began on this day: [{ outing, years }]. */
export function onThisDayTrips(outings, today) {
  const md = today.slice(5)
  return (outings || []).filter((o) => o.starts_on.slice(5) === md && o.starts_on < today).map((o) => ({ outing: o, years: Number(today.slice(0, 4)) - Number(o.starts_on.slice(0, 4)) })).filter((x) => x.years > 0)
}

const TRAVEL_QUESTIONS = [
  'What surprised you today?', 'What did you see today that you want to remember?', 'Who did you meet, and what did they show you?',
  'What tasted best today?', 'What would you tell someone coming here next?', 'What made you laugh today?', 'Where did you feel most at peace today?',
]
/** The journal's question while away, by weekday: picked on the phone, never knowing where. */
export const travelQuestion = (date) => ({ title: 'On the road.', prompt: TRAVEL_QUESTIONS[new Date(date + 'T12:00:00Z').getUTCDay()] })

/** Water boils about a degree lower for every 500 feet up: the Kitchen's word at height. */
export const boilingF = (feet) => Math.round(212 - Math.max(0, feet) / 500)
export function altitudeWords(feet) {
  if (!(feet >= 2500)) return ''
  return `At ${(Math.round(feet / 10) * 10).toLocaleString('en-US')} ft water boils at about ${boilingF(feet)}°F: pasta, rice and eggs take a little longer, and baking may want a hotter oven and less leavening.`
}

// ---- The Milky Way's core, worked out on the phone -----------------------------
const RAD = Math.PI / 180
const CORE = { ra: 266.417, dec: -29.008 } // Sagittarius A*, the galaxy's centre
const julian = (t) => t.getTime() / 86400000 + 2440587.5
function corePosition(t, lat, lng) {
  const lst = (280.46061837 + 360.98564736629 * (julian(t) - 2451545.0) + lng) % 360
  const ha = (lst - CORE.ra) * RAD, phi = lat * RAD, dec = CORE.dec * RAD
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha))
  const az = Math.atan2(-Math.sin(ha) * Math.cos(dec), Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(ha))
  return { alt: alt / RAD, az: ((az / RAD) + 360) % 360 }
}
const COMPASS16 = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest']
export const compass16 = (az) => COMPASS16[Math.round(az / 22.5) % 16]
/**
 * When the Milky Way's core is up in the dark tonight: the first moment between
 * astronomical dusk and dawn that it stands 10° above the horizon, or null (out of
 * season). `times` are SunCalc's for tonight and tomorrow: { night } and { nightEnd }.
 */
export function coreTonight(lat, lng, dusk, dawn) {
  if (!(dusk instanceof Date) || !(dawn instanceof Date) || isNaN(dusk) || isNaN(dawn) || dawn <= dusk) return null
  for (let t = dusk.getTime(); t <= dawn.getTime(); t += 10 * 60e3) {
    const p = corePosition(new Date(t), lat, lng)
    if (p.alt >= 10) return { at: new Date(t), az: p.az, alt: Math.round(p.alt), already: t === dusk.getTime() }
  }
  return null
}

// ---- Our day, stitched together from the guide, the weather and the sun --------
const pick = (guide, key, n = 0) => { const s = guide && (guide.sections || []).find((x) => x.key === key); return s && s.items[n] ? { ...s.items[n], section: key } : null }
const at = (day, h, m = 0) => { const d = new Date(day); d.setHours(h, m, 0, 0); return d }
/**
 * Today as a plan: morning coffee, a hike that fits before sunset (none in the rain),
 * lunch where the local thing is done best, an afternoon (indoors in the rain), golden
 * hour at a view, Mass on a Saturday evening or Sunday, dinner, and the sky. Times are
 * suggestions ("about"); every stop is a place from the guide or the open map.
 */
export function dayPlan({ guide, map = null, now, sunset = null, golden = null, rainy = false, weekday = now ? now.getDay() : 1, core = null, moon = null }) {
  if (!guide) return []
  const stops = []
  const add = (key, label, time, item) => { if (item) stops.push({ key, label, time, item }) }
  add('coffee', 'Morning coffee', at(now, 8), pick(guide, 'coffee'))
  if (!rainy) {
    const hike = pick(guide, 'hikes', 1) || pick(guide, 'hikes')
    const latest = hike ? startBy(hike.hike, sunset, at(now, 7)) : null // set off by this to be down before sunset
    if (hike) add('hike', 'A hike', latest && latest < at(now, 9, 30) ? latest : at(now, 9, 30), hike)
  }
  add('lunch', 'Lunch: the local thing', at(now, 12, 30), pick(guide, 'local-food'))
  add('afternoon', rainy ? 'An afternoon indoors' : 'The afternoon', at(now, 15), rainy ? (pick(guide, 'books-records') || pick(guide, 'art') || pick(guide, 'anna')) : (pick(guide, 'village') || pick(guide, 'anna')))
  const view = (map && map.map && map.map.views && map.map.views[0]) ? { name: map.map.views[0].name, why: 'A viewpoint on the open map', section: 'views', lat: map.map.views[0].lat, lng: map.map.views[0].lng, sources: [] } : pick(guide, 'art')
  if (golden && !rainy) add('golden', 'Golden hour', golden, view || { name: 'Golden hour', why: 'The light goes warm and long', section: 'sky', sources: [] })
  if (weekday === 6 || weekday === 0) add('mass', 'Mass (check the parish’s times)', null, pick(guide, 'mass'))
  add('dinner', 'Dinner', at(now, 18, 30), pick(guide, 'brewpubs') || pick(guide, 'local-food', 1))
  if (core && (moon == null || moon < 0.5)) add('sky', 'The Milky Way', core.at, { name: `The Milky Way’s core, low in the ${compass16(core.az)}`, why: 'Away from the lights, give your eyes twenty minutes', section: 'sky', sources: [] })
  else if (pick(guide, 'sky')) add('sky', 'Look up', null, pick(guide, 'sky'))
  return stops
}
/** A plan in the order someone chose (by key), the rest after in the plan's own order. */
export function inOrder(stops, keys = []) {
  const k = (keys || []).filter((x) => stops.some((s) => s.key === x))
  return [...k.map((x) => stops.find((s) => s.key === x)), ...stops.filter((s) => !k.includes(s.key))]
}
export function moveStop(keys, key, by) {
  const i = keys.indexOf(key), j = i + by
  if (i < 0 || j < 0 || j >= keys.length) return keys
  const out = keys.slice(); [out[i], out[j]] = [out[j], out[i]]
  return out
}

// ---- Abroad ---------------------------------------------------------------------
/** A few facts for the countries we're likeliest to visit (to check before going: shown as such). */
export const ABROAD = {
  FR: { words: [['Hello', 'Bonjour'], ['Please', 'S’il vous plaît'], ['Thank you', 'Merci']], plugs: 'Types C and E, 230 V', call: '112', money: 'EUR' },
  GB: { words: [], plugs: 'Type G, 230 V', call: '999 or 112', money: 'GBP' },
  IE: { words: [['Hello', 'Dia dhuit'], ['Thank you', 'Go raibh maith agat']], plugs: 'Type G, 230 V', call: '112 or 999', money: 'EUR' },
  IT: { words: [['Hello', 'Buongiorno'], ['Please', 'Per favore'], ['Thank you', 'Grazie']], plugs: 'Types C, F and L, 230 V', call: '112', money: 'EUR' },
  ES: { words: [['Hello', 'Hola'], ['Please', 'Por favor'], ['Thank you', 'Gracias']], plugs: 'Types C and F, 230 V', call: '112', money: 'EUR' },
  PT: { words: [['Hello', 'Olá'], ['Please', 'Por favor'], ['Thank you', 'Obrigado (obrigada)']], plugs: 'Types C and F, 230 V', call: '112', money: 'EUR' },
  DE: { words: [['Hello', 'Guten Tag'], ['Please', 'Bitte'], ['Thank you', 'Danke']], plugs: 'Types C and F, 230 V', call: '112', money: 'EUR' },
  NL: { words: [['Hello', 'Hallo'], ['Please', 'Alstublieft'], ['Thank you', 'Dank u']], plugs: 'Types C and F, 230 V', call: '112', money: 'EUR' },
  GR: { words: [['Hello', 'Yia sas'], ['Please', 'Parakaló'], ['Thank you', 'Efcharistó']], plugs: 'Types C and F, 230 V', call: '112', money: 'EUR' },
  MX: { words: [['Hello', 'Hola'], ['Please', 'Por favor'], ['Thank you', 'Gracias']], plugs: 'Types A and B, as at home', call: '911', money: 'MXN' },
  CR: { words: [['Hello', 'Hola'], ['Please', 'Por favor'], ['Thank you', 'Gracias']], plugs: 'Types A and B, as at home', call: '911', money: 'CRC' },
  CA: { words: [['Hello', 'Bonjour (in Quebec)'], ['Thank you', 'Merci']], plugs: 'Types A and B, as at home', call: '911', money: 'CAD' },
  JP: { words: [['Hello', 'Konnichiwa'], ['Please', 'Onegaishimasu'], ['Thank you', 'Arigatō']], plugs: 'Types A and B, 100 V', call: '110 (police), 119 (fire and ambulance)', money: 'JPY' },
  CN: { words: [['Hello', 'Nǐ hǎo'], ['Please', 'Qǐng'], ['Thank you', 'Xièxie']], plugs: 'Types A, C and I, 220 V', call: '110 (police), 120 (ambulance)', money: 'CNY' },
  AU: { words: [], plugs: 'Type I, 230 V', call: '000', money: 'AUD' },
  NZ: { words: [], plugs: 'Type I, 230 V', call: '111', money: 'NZD' },
}
const FX = ['EUR', 'GBP', 'MXN', 'CAD', 'JPY', 'CNY', 'AUD', 'NZD']
/** The European Central Bank's rate for a dollar, through Frankfurter (free, no key), for the currencies it carries. */
export const fxUrl = (money) => (FX.includes(money) ? `https://api.frankfurter.app/latest?from=USD&to=${money}` : null)
export function shapeFx(json, money) {
  const r = json && json.rates && json.rates[money]
  return typeof r === 'number' && r > 0 ? { rate: Math.round(r * 1000) / 1000, date: String(json.date || '').slice(0, 10) } : null
}

// ---- This place in jam history (the Live Music Archive) ----------------------------
const STATES = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC' }
/** The Live Music Archive's shows taped in a town (its `coverage` is "Town, ST" in the US). Null outside the US. */
export function showsUrl(town, region) {
  const st = STATES[region] || (/^[A-Z]{2}$/.test(region || '') ? region : null)
  if (!town || !st) return null
  const q = `collection:etree AND coverage:"${String(town).replace(/"/g, '').slice(0, 60)}, ${st}"`
  return `https://archive.org/advancedsearch.php?${new URLSearchParams({ q, 'fl[]': 'identifier', rows: '8', 'sort[]': 'date asc', output: 'json' })}&fl[]=title&fl[]=date&fl[]=creator`
}
export function shapeShows(json) {
  const docs = (json && json.response && Array.isArray(json.response.docs)) ? json.response.docs : []
  return docs.filter((d) => d && /^[A-Za-z0-9._-]{3,100}$/.test(String(d.identifier || ''))).map((d) => ({
    title: String(Array.isArray(d.title) ? d.title[0] : d.title || '').replace(/[<>]/g, '').slice(0, 140),
    creator: String(Array.isArray(d.creator) ? d.creator[0] : d.creator || '').replace(/[<>]/g, '').slice(0, 80),
    year: /^\d{4}/.test(String(d.date || '')) ? String(d.date).slice(0, 4) : '',
    url: `https://archive.org/details/${d.identifier}`,
  })).slice(0, 8)
}

/** A sentence for crossing a time zone, from the offsets either side: "You just gained an hour." */
export function zoneShiftWords(fromOffsetMin, toOffsetMin) {
  const d = (toOffsetMin - fromOffsetMin) / 60
  if (!d) return ''
  const n = Math.abs(d), h = n === 1 ? 'an hour' : `${n} hours`
  return d < 0 ? `You just gained ${h}.` : `You just lost ${h}: the clocks here are ${h} ahead.`
}
/** A time zone's offset from UTC in minutes at a moment (for zoneShiftWords). */
export function offsetMin(tz, when = new Date()) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(when).map((p) => [p.type, p.value]))
    const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
    return Math.round((local - Math.floor(when.getTime() / 60000) * 60000) / 60000)
  } catch { return 0 }
}
export const WEEKDAY = (date) => WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]
