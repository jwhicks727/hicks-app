// ============================================
// sacredHeart.js -- Mass and confession at Sacred Heart, Rancho Cucamonga
// ============================================
// Unverified: the schedule as the Diocese of San Bernardino's parish listing
// gave it when the mockup was made, not yet checked with the parish itself.
// Holy days keep their own times, which the parish posts; the app says so
// rather than guessing.

import { dow, addDays } from './dates.js'

export const PARISH = {
  name: 'Sacred Heart',
  town: 'Rancho Cucamonga',
  checked: 'unverified',
  source: 'The Diocese of San Bernardino’s parish listing',
}

const MASS = {
  0: ['7:00 AM', '8:30 AM in Spanish', '10:30 AM with ASL', '12:30 PM', '5:00 PM', '7:00 PM in Spanish'],
  1: ['7:30 AM'], 2: ['7:30 AM', '6:15 PM in Spanish'], 3: ['7:30 AM', '6:15 PM'], 4: ['7:30 AM'], 5: ['7:30 AM'],
  6: ['7:30 AM', '5:00 PM, the vigil for Sunday'],
}
const CONFESSION = { 2: '5:00–6:00 PM', 6: '3:30–4:30 PM' }

/**
 * A day at the parish: { mass: [...], confession, note }. `lit` and
 * `litTomorrow` are liturgicalDay() for the day and the next, so a holy day
 * says to check its times and its eve says a vigil is likely tonight.
 */
export function parishDay(d, lit, litTomorrow) {
  const wd = dow(d)
  let note = null
  if (lit.obligation && wd !== 0) note = 'A holy day of obligation: the parish posts its own Mass times for it.'
  else if (litTomorrow && litTomorrow.obligation && dow(addDays(d, 1)) !== 0) note = `Tomorrow is ${litTomorrow.name}: look for a vigil Mass this evening.`
  else if (lit.key === 'holyThursday' || lit.key === 'goodFriday' || lit.key === 'holySaturday') note = 'The Triduum has its own services: the parish posts the times.'
  return { mass: MASS[wd], confession: CONFESSION[wd] || null, note }
}
