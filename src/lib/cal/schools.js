// The three school calendars the year view lays side by side. Each is read
// from a calendar source in Admin whose "for" is the person it belongs to.
export const SCHOOLS = [
  { key: 'kordyak', name: 'Kordyak', district: 'Rialto Unified', person: 'Laurie', role: 'teacher', colour: '#E0662F' },
  { key: 'ruble', name: 'Wayne Ruble', district: 'Fontana Unified', person: 'Anna', role: 'student', colour: '#4A7FD6' },
  { key: 'soar', name: 'SOAR', district: 'SOAR Charter Academy', person: 'Jason', role: 'staff', colour: '#5FA85A' },
]

/**
 * Which schools have no school on each date: { 'YYYY-MM-DD': Set(keys) },
 * from approved no_school events, each matched to its person directly or
 * through its source.
 */
export function noSchoolDays(events, sources, members) {
  const byMember = new Map(members.map((m) => [m.id, SCHOOLS.find((s) => s.person.toLowerCase() === (m.name || '').toLowerCase())]))
  const sourceWho = new Map(sources.map((s) => [s.id, s.for_whom]))
  const out = {}
  for (const e of events) {
    if (e.kind !== 'no_school') continue
    const school = byMember.get(e.for_whom || sourceWho.get(e.source_id))
    if (!school) continue
    for (let d = e.starts_on; d <= e.ends_on; d = next(d)) (out[d] ||= new Set()).add(school.key)
  }
  return out
}
const next = (d) => new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10)

/** Which schools have a calendar in Admin at all. */
export function schoolsWithCalendars(sources, members) {
  return SCHOOLS.filter((s) => sources.some((src) => members.find((m) => m.id === src.for_whom && (m.name || '').toLowerCase() === s.person.toLowerCase())))
}

/**
 * Events with their person resolved (their own, or their source's) and, for
 * a school calendar's events, which school: so "Thanksgiving break" can say
 * whose, and filtering to one of us shows their school.
 */
export function annotateEvents(events, sources, members) {
  const sourceWho = new Map(sources.map((s) => [s.id, s.for_whom]))
  const schoolOf = new Map(members.map((m) => [m.id, SCHOOLS.find((s) => s.person.toLowerCase() === (m.name || '').toLowerCase()) || null]))
  return events.map((e) => {
    const who = e.for_whom || sourceWho.get(e.source_id) || null
    const school = ['no_school', 'school'].includes(e.kind) ? schoolOf.get(who) || null : null
    return { ...e, for_whom: who, school }
  })
}
