// ============================================
// annasArt.js -- Anna's Art in the gallery's own terms, so both artists' walls share one set of tools
// ============================================
// Pure, so tests run it in Node (tests/annas-art.test.mjs). A row of `annas_drawings` becomes a piece the
// gallery's finding, sorting and featured walls understand (src/lib/gallery.js): its id is its slug, the day
// she made it gives its year and month, and its colours, fingerprint, shape and the words Claude saw in it
// (kept once whoever added it, or a parent, said so) come with it. Her own words never do: they're hers.
import { cleanShape, shapeFromReading } from './shapes.js'
import { cleanMedium } from './paintingBatch.js'
import { cleanPalette, validPrint } from './artColour.js'
import { cleanLooks, kindOf } from './gallery.js'

/** A drawing (or painting) row as a gallery piece. `small` is its picture's link, when there is one. */
export function artOf(d, small = '') {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(d.made_on || '')
  return {
    slug: d.id, id: d.id, title: d.title, named: true, year: m ? Number(m[1]) : null, month: m ? Number(m[2]) : null,
    medium: d.medium || '', kind: kindOf(d.medium), seasons: [], topics: d.topic ? [d.topic] : [],
    looks: cleanLooks(d.looks), palette: cleanPalette(d.palette), shape: cleanShape(d.shape), print: validPrint(d.print) ? d.print : null,
    added: String(d.created_at || '').slice(0, 10), w: d.width || null, h: d.height || null, small,
  }
}

/**
 * What looking at one of her pieces again suggests, for a parent to tick: its medium and its shape (only where none is
 * kept), the day written on it (only where none is kept), and the words Claude saw. Never her title or her words.
 */
export function drawingProposals(d, reading, today) {
  const out = {}
  if (!reading) return out
  const medium = cleanMedium(reading.medium)
  if (medium && !d.medium) out.medium = { value: medium, sure: true }
  const sh = cleanShape(shapeFromReading(reading.shape))
  if (sh && !cleanShape(d.shape)) out.shape = { value: sh, sure: true }
  const day = String(reading.written_date || '').trim()
  const ok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (ok && !d.made_on && (!today || day <= today)) {
    const dt = new Date(Date.UTC(+ok[1], +ok[2] - 1, +ok[3]))
    if (dt.getUTCMonth() === +ok[2] - 1 && dt.getUTCDate() === +ok[3]) out.madeOn = { value: day, sure: false }
  }
  const looks = cleanLooks(reading)
  if (looks) out.looks = { value: looks }
  return out
}
