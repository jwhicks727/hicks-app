// ============================================
// mediaMove.js -- moving the pictures from Supabase's storage to R2: the parts that need no screen
// ============================================
// Pure, so tests run it in Node. The screen is src/consoles/MediaMove.jsx.
import { drawingFiles } from './drawings.js'
import { inboxPath } from './paintingBatch.js'

/** Each area (an old Supabase bucket), and what the screen calls it. */
export const MEDIA_AREAS = [['paintings', 'Laurie’s paintings'], ['drawings', 'Anna’s drawings'], ['trips', 'Trip photos'], ['garden', 'Garden photos'], ['academy', 'Academy pictures']]

/** Is R2's copy the same picture? There, and the same size to the byte. A copy of unknown size never counts. */
export const matchesCopy = (file, head) => Boolean(file && head && head.exists && file.size > 0 && head.size === file.size)

/**
 * Who added each of Anna's drawings' files (path -> family member id), from the drawings' rows and the
 * batch waiting, so a drawing moved over can still be taken away only by whoever added it, or a parent.
 */
export function drawingOwners(drawings, inbox) {
  const owners = new Map()
  for (const d of drawings || []) {
    if (!d || !d.added_by) continue
    for (const p of [d.path, d.thumb_path, d.original ? drawingFiles(d.id).original : null]) if (p) owners.set(p, d.added_by)
  }
  for (const r of inbox || []) if (r && r.added_by) for (const n of ['kept', 'view', 'thumb']) owners.set(inboxPath(r.id, n), r.added_by)
  return owners
}

/** "312 MB", "1.4 GB", "820 KB". */
export function sizeWords(bytes) {
  const b = Math.max(0, Number(bytes) || 0)
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`
  if (b >= 1024 ** 2) return `${Math.round(b / 1024 ** 2)} MB`
  return `${Math.max(b ? 1 : 0, Math.round(b / 1024))} KB`
}
