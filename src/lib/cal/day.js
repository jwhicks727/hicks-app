// ============================================
// day.js -- everything on one day, gathered for the screens
// ============================================

import { liturgicalDay } from './liturgy.js'
import { observancesOn } from './observances.js'
import { familyOn } from './family.js'
import { moonPhases } from './nature.js'
import { parts } from './dates.js'

const moonCache = new Map()
/** The moon's phase that falls on a date, if any (new, first quarter, full, last quarter). */
export function moonOn(d) {
  const y = parts(d)[0]
  if (!moonCache.has(y)) moonCache.set(y, moonPhases(y))
  return moonCache.get(y).find((p) => p.date === d) || null
}

/** Is this row for this person (or for everyone)? `who` null means everyone's. */
export const forWho = (who) => (row) => !who || !row.for_whom || row.for_whom === who || (row.also_for || []).includes(who)

/**
 * One day: { date, lit, family, observances, ongoing, moon, events }.
 * `data` holds what's been loaded from the family's database (empty when
 * signed out): family days, events and whose to show.
 */
export function dayView(d, { familyDays = [], events = [], groups = null, who = null } = {}) {
  const all = observancesOn(d, groups)
  return {
    date: d,
    lit: liturgicalDay(d),
    family: familyOn(d, familyDays.filter(forWho(who))),
    observances: all.filter((o) => !o.ongoing),
    ongoing: all.filter((o) => o.ongoing),
    moon: moonOn(d),
    events: events.filter((e) => e.starts_on <= d && e.ends_on >= d).filter(forWho(who)),
    eclipse: (all.find((o) => o.eclipse && o.eclipse.kind === 'lunar') || {}).eclipse || null,
  }
}
