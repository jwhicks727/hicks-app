// ============================================
// drawings.js -- Anna's Gallery, the parts that need no React or database
// ============================================
// Her drawings live in the `annas_drawings` table and the private `drawings`
// bucket (supabase/migrations/20261105040000_annas_gallery.sql), never in the
// app's own files: anything in `public/` can be opened by anyone with the
// address. Everything about a drawing (title, date, words, what it's about)
// is what the person adding it typed; nothing is guessed from the picture.

/** What a drawing can be about, where that matters to another screen: the Pets launch hangs the newest "pets" one. */
export const TOPICS = { pets: 'Our pets' }

/** Where a drawing's files go in the bucket: the picture, and a small one for the wall. */
export const drawingFiles = (id) => ({ path: `${id}.jpg`, thumb: `${id}.thumb.jpg` })

/** Newest first: by the day she drew it where that's known, else the day it was added; then the order added. */
export function sortDrawings(rows) {
  const day = (r) => r.made_on || String(r.created_at || '').slice(0, 10)
  return [...rows].sort((a, b) => (day(b) < day(a) ? -1 : day(b) > day(a) ? 1 : String(b.created_at) < String(a.created_at) ? -1 : String(b.created_at) > String(a.created_at) ? 1 : 0))
}

/** The drawing the Pets launch hangs: the newest one marked as being about the pets, or null. */
export function petsDrawing(rows) {
  return sortDrawings(rows).find((r) => r.topic === 'pets') || null
}

const longDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
/** "Drawn November 4, 2026", built from the date's parts (new Date('2026-11-04') is the evening before at home); '' with no date. */
export function drawnWords(madeOn) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(madeOn || '')
  return m ? `Drawn ${longDay.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])))}` : ''
}

/** A real calendar date, in the form a date box gives, and not after `today` ("YYYY-MM-DD"). */
export function validMadeOn(s, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return false
  return !today || s <= today
}

/**
 * The form's values as a row's fields, or `error` in words. A blank date, topic or words is none, not an empty string.
 */
export function cleanDrawing(f, today) {
  const title = String((f && f.title) || '').trim().replace(/\s+/g, ' ')
  if (!title) return { error: 'Give it a title.' }
  if (title.length > 120) return { error: 'That title is a little long: 120 letters at most.' }
  const madeOn = String((f && f.madeOn) || '').trim()
  if (madeOn && !validMadeOn(madeOn, today)) return { error: 'That date isn’t one it can be: a real day, not after today.' }
  const words = String((f && f.words) || '').trim()
  if (words.length > 1000) return { error: 'Those words are a little long: 1000 letters at most.' }
  const topic = f && TOPICS[f.topic] ? f.topic : null
  return { title, made_on: madeOn || null, words: words || null, topic }
}

/** A small, steady lean for a paper on the wall, from its id: the same every time, never random per visit. */
export function tilt(id) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return Math.round(((h % 1000) / 1000 * 3.2 - 1.6) * 10) / 10
}

/** Which of four tapes holds a paper up (pink, yellow, mint, lilac), from its id. */
export function tapeOf(id) {
  let h = 7
  for (const c of String(id)) h = (h * 17 + c.charCodeAt(0)) >>> 0
  return h % 4
}

/** True when the database answered that the table isn't there: the migration hasn't been run. */
export const migrationMissing = (error) => Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '')))
