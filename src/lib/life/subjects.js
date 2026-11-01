// ============================================
// subjects.js -- which of Laurie's paintings stands in for a photo
// ============================================
// Pure: tests/life-list.test.mjs. A painting is told what it is a painting of,
// by her or a parent, never guessed: a subject is `park:<slug>`, `bird:<key>` or
// `place:<key>`. Wherever the Life List would show a photo of that thing (a
// bird, a national park, a place she's been), her painting takes its place.

import { slug } from './birdStats.js'

export const subjectOf = (kind, name) => `${kind}:${slug(name)}`
export const SUBJECT_KINDS = { park: 'A national park', bird: 'A bird', place: 'A place' }

/** The subject keys a painting has (an empty list when none have been set). */
export const subjectsOf = (p) => (p && Array.isArray(p.subjects) ? p.subjects : [])

/** Her painting of a thing, or null: the first painting (newest first) that has the subject. */
export function paintingOf(paintings, subject) {
  return (paintings || []).find((p) => subjectsOf(p).includes(subject)) || null
}

/** A subject key as words: "park:joshua-tree" as "Joshua Tree" given the names we know. */
export function subjectWords(key, parks = []) {
  const [kind, rest] = String(key).split(':')
  const park = kind === 'park' ? parks.find((p) => p.slug === rest) : null
  return park ? park.name : String(rest || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Check a list of subjects before it is saved: known kinds, tidy keys, at most twelve. */
export function cleanSubjects(list) {
  const out = []
  for (const s of list || []) {
    const m = /^(park|bird|place):([a-z0-9-]{1,80})$/.exec(String(s))
    if (m && !out.includes(s)) out.push(s)
  }
  return out.slice(0, 12)
}
