// ============================================
// mascots.js -- the school's mascots (Anna can have several)
// ============================================
// `academy_settings.mascot` is one text column (60 characters at most), so the mascots are kept as their
// keys joined by commas: "panther,cheetah,tiger". An old single mascot ("tiger") reads as a list of one.
// `art` is the catalog picture it wears (src/academy/items.js). Fluent Emoji has no cheetah, panther or
// lion cub, so those wear the nearest human-made picture under their own name (docs/ACADEMY-ART.md).

export const MASCOTS = [
  { k: 'tiger', label: 'Tiger', art: 'tiger' },
  { k: 'panther', label: 'Panther', art: 'black-cat' },
  { k: 'cheetah', label: 'Cheetah', art: 'leopard' },
  { k: 'leopard', label: 'Leopard', art: 'leopard' },
  { k: 'eagle', label: 'Eagle', art: 'eagle' },
  { k: 'lion-cub', label: 'Lion cub', art: 'lion' },
  { k: 'lion', label: 'Lion', art: 'lion' },
  { k: 'cat', label: 'Cat', art: 'cat' },
  { k: 'black-cat', label: 'Black cat', art: 'black-cat' },
  { k: 'owl', label: 'Owl', art: 'owl' },
  { k: 'dragon', label: 'Dragon', art: 'dragon' },
  { k: 'unicorn', label: 'Unicorn', art: 'unicorn' },
  { k: 'fox', label: 'Fox', art: 'fox' },
  { k: 'panda', label: 'Panda', art: 'panda' },
  { k: 'dolphin', label: 'Dolphin', art: 'dolphin' },
  { k: 'butterfly', label: 'Butterfly', art: 'butterfly' },
]
export const MASCOT = Object.fromEntries(MASCOTS.map((m) => [m.k, m]))
export const MAX_MASCOTS = 5
const MAX_LENGTH = 60 // the column's limit

/** The mascots a saved value names, in order, without repeats or anything unknown. */
export function parseMascots(value) {
  const seen = []
  for (const k of String(value || '').split(',').map((s) => s.trim())) if (MASCOT[k] && !seen.includes(k)) seen.push(k)
  return seen.slice(0, MAX_MASCOTS)
}

/** What to save: the keys joined, or null for none. */
export function joinMascots(list) {
  const keys = parseMascots(Array.isArray(list) ? list.join(',') : list)
  const text = keys.join(',')
  return keys.length && text.length <= MAX_LENGTH ? text : null
}

/** Pick or put back one: a list with it added (up to the most allowed), or without it. */
export function toggleMascot(list, k) {
  if (list.includes(k)) return list.filter((x) => x !== k)
  return list.length >= MAX_MASCOTS ? list : [...list, k]
}
