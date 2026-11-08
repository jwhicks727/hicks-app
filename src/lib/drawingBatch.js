// ============================================
// drawingBatch.js -- many of Anna's drawings at once: what a waiting photo holds, and what Claude's reading may fill in
// ============================================
// Pure, so tests run it in Node. The screen is src/places/AddDrawings.jsx. A batch waits in the family's storage
// (`drawing_inbox` and `inbox/<id>/` in the private `drawings` bucket, src/lib/inboxStore.js), so it can be sent from
// one device and finished on another. The crop and its sums are src/lib/paintingBatch.js's, shared with Laurie's
// paintings; only what's kept about a drawing differs. A drawing is only ever cropped, turned and shrunk, never altered.
import { inboxData, cleanTitle, fitInside, turnCrop, readTurn } from './paintingBatch.js'
import { TOPICS, validMadeOn } from './drawings.js'

/** A drawing is kept at 3000 px (under the bucket's 8 MB a file, with room to spare) and saved at 2000 px, with a 640 px one for the wall. */
export const DRAWING_KEPT = { kept: 3000, keptQuality: 0.88 }
export const DRAWING_SAVED = { full: 2000, small: 640, fullQuality: 0.9, smallQuality: 0.82 }

/** The parts of a waiting drawing that travel to the family's storage; the rest stays on the device. */
export const DRAWING_SYNCED = ['id', 'seq', 'name', 'status', 'read', 'readAt', 'readError', 'title', 'titleFrom', 'madeOn', 'madeOnFrom', 'topic', 'topicFrom', 'words', 'touched', 'reading', 'W', 'H', 'crop', 'auto', 'sure', 'kind', 'saveError', 'savingAt', 'error', 'addedBy']
export const drawingInboxData = (item) => inboxData(item, DRAWING_SYNCED)

/**
 * A drawing after Claude has looked at it: a working title, the topic and any day written on it are filled in only
 * where nobody has set their own, and it's turned upright if it lay sideways and nobody has touched its crop. Her
 * words are never filled in: they're what she said, not what a picture shows. Each says where it came from.
 */
export function applyDrawingReading(item, reading, today) {
  const next = { ...item, read: 'done', reading: { written: String(reading.written_date || '').slice(0, 40) } }
  const touched = item.touched || {}
  if (!touched.title) { const t = cleanTitle(reading.title).slice(0, 120); if (t) { next.title = t; next.titleFrom = 'claude' } }
  if (!touched.topic) { next.topic = TOPICS[reading.topic] ? reading.topic : ''; next.topicFrom = next.topic ? 'claude' : null }
  if (!touched.madeOn) {
    const d = String(reading.written_date || '').trim()
    next.madeOn = validMadeOn(d, today) ? d : ''
    next.madeOnFrom = next.madeOn ? 'claude' : null
  }
  const turn = readTurn(reading.turn)
  if (!touched.crop && turn && item.crop) next.crop = fitInside(turnCrop(item.crop, item.W, item.H, turn), item.W, item.H)
  return next
}
