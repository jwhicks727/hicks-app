// ============================================
// sacredHeart.js -- Mass and confession at Sacred Heart, Rancho Cucamonga
// ============================================
// The parish's own website is read (the `parish` Edge Function,
// supabase/functions/_shared/parish.js) and its week kept in the database;
// `schedule` is that reading. Until there is one, or for a family member
// signed out, the Diocese of San Bernardino's listing below stands in and
// says it's unchecked. Holy days keep their own times, which the parish
// posts; the app says so rather than guessing. Every weekday Mass, and
// Saturday morning's, is a Daily Mass; Saturday evening's is Sunday's vigil.

import { dow, addDays } from './dates.js'

export const PARISH = {
  name: 'Sacred Heart',
  town: 'Rancho Cucamonga',
  site: 'https://www.sacredheartrc.org/',
  listing: 'the Diocese of San Bernardino’s parish listing',
}

const e = (time, note = '') => ({ time, note })
const LISTING = {
  mass: {
    0: [e('7:00 AM'), e('8:30 AM', 'in Spanish'), e('10:30 AM', 'with ASL'), e('12:30 PM'), e('5:00 PM'), e('7:00 PM', 'in Spanish')],
    1: [e('7:30 AM')], 2: [e('7:30 AM'), e('6:15 PM', 'in Spanish')], 3: [e('7:30 AM'), e('6:15 PM')], 4: [e('7:30 AM')], 5: [e('7:30 AM')],
    6: [e('7:30 AM'), e('5:00 PM')],
  },
  confession: { 2: ['5:00–6:00 PM'], 6: ['3:30–4:30 PM'] },
}

const h24 = (t) => { const m = /^(\d{1,2}):(\d\d) ([AP])M/.exec(t); return m ? (Number(m[1]) % 12) + (m[3] === 'P' ? 12 : 0) + Number(m[2]) / 60 : 0 }
/** Daily Mass and the vigil, by the day and the hour, whatever the source said. */
function kinds(wd, list) {
  return list.map((m) => ({
    time: m.time, note: m.note || '',
    daily: wd >= 1 && wd <= 5 ? true : wd === 6 ? h24(m.time) < 12 && !m.vigil : false,
    vigil: wd === 6 && (Boolean(m.vigil) || h24(m.time) >= 15),
  })).sort((a, b) => h24(a.time) - h24(b.time))
}

/** A weekday's Masses (0 is Sunday) in a week read from the parish, marked Daily Mass or the vigil. */
export const massesOn = (wd, schedule) => kinds(wd, (schedule && schedule.mass && schedule.mass[wd]) || [])

/** The hour of a Mass (24-hour, with minutes as a fraction), for "later today". */
export const massHour = (m) => h24(m.time)

/** The words after a Mass's time: "Daily Mass", "in Spanish", "the vigil for Sunday". */
export function massWords(m) {
  return [m.daily && 'Daily Mass', m.note, m.vigil && 'the vigil for Sunday'].filter(Boolean).join(', ')
}

/**
 * A day at the parish: { mass: [{ time, note, daily, vigil }], confession, note, fromParish }.
 * `lit` and `litTomorrow` are liturgicalDay() for the day and the next, so a holy
 * day says to check its times and its eve says a vigil is likely tonight.
 * `schedule` is the parish website's week ({ mass, confession }), or null.
 */
export function parishDay(d, lit, litTomorrow, schedule = null) {
  const wd = dow(d)
  const src = schedule && schedule.mass && schedule.mass[0] && schedule.mass[0].length ? schedule : LISTING
  let note = null
  if (lit.obligation && wd !== 0) note = 'A holy day of obligation: the parish posts its own Mass times for it.'
  else if (litTomorrow && litTomorrow.obligation && dow(addDays(d, 1)) !== 0) note = `Tomorrow is ${litTomorrow.name}: look for a vigil Mass this evening.`
  else if (lit.key === 'holyThursday' || lit.key === 'goodFriday' || lit.key === 'holySaturday') note = 'The Triduum has its own services: the parish posts the times.'
  const conf = (src.confession && src.confession[wd]) || []
  return { mass: kinds(wd, (src.mass && src.mass[wd]) || []), confession: conf.length ? conf.join(', ') : null, note, fromParish: src !== LISTING }
}
