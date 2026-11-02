/**
 * A person can have more than one sign-in address, so more than one row of the same
 * name. For showing and filtering they are one person: `people` has one entry per name
 * and `canon` maps any of their ids to that entry's id. (`members` keeps every row: a
 * sign-in is found by its address there.)
 */
export function onePerPerson(members) {
  const first = new Map()
  for (const m of members) { const k = (m.name || '').trim().toLowerCase(); if (!first.has(k) || m.id < first.get(k).id) first.set(k, m) }
  const canonId = new Map(members.map((m) => [m.id, first.get((m.name || '').trim().toLowerCase()).id]))
  return { people: [...first.values()].sort((a, b) => a.name.localeCompare(b.name)), canon: (id) => (id && canonId.has(id) ? canonId.get(id) : id) }
}

/** A family day entered twice shows once (the same title, date and person). */
export const sameDaysOnce = (days) => { const seen = new Set(); return days.filter((d) => { const k = [d.title, d.month, d.day, d.year, d.for_whom].join('|'); if (seen.has(k)) return false; seen.add(k); return true }) }
