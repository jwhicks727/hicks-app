// ============================================
// ownArt.js -- Anna's drawings and Laurie's paintings, as things to place in a room
// ============================================
// A placed thing is a key in the room's items: 'd:<drawing id>' for one of Anna's drawings, 'p:<slug>' for one of
// Laurie's paintings (the family's own pictures added by hand are 'a:<id>', and the catalog's are plain names).
// The key is all a room keeps: the picture itself stays where it lives (the private `drawings` and `paintings`
// buckets, through signed links), so nothing is copied and a drawing taken down simply leaves its square empty.
// Pure, so tests run it in Node (tests/own-art.test.mjs).

export const DRAWING = 'd:', PAINTING = 'p:'

export const drawingKey = (id) => DRAWING + id
export const paintingKey = (slug) => PAINTING + slug

/** Is this key one of Anna's drawings or Laurie's paintings? */
export const isOwnArt = (k) => typeof k === 'string' && (k.startsWith(DRAWING) || k.startsWith(PAINTING))

/** { kind: 'drawing' | 'painting', id } for an own-art key, else null. */
export function parseArtKey(k) {
  if (!isOwnArt(k)) return null
  return { kind: k.startsWith(DRAWING) ? 'drawing' : 'painting', id: k.slice(2) }
}

/** A drawing's small picture (its thumbnail, else the drawing itself). */
export const drawingFile = (d) => d.thumb_path || d.path

/**
 * Everything that can be placed, newest first as the screens keep them: [{ k, name, kind, file?, url? }].
 * A drawing carries its storage path (`file`, to be signed); a painting carries its signed link (`url`).
 */
export function artList(drawings = [], paintings = []) {
  return [
    ...drawings.map((d) => ({ k: drawingKey(d.id), name: d.title, kind: 'drawing', file: drawingFile(d) })),
    ...paintings.map((p) => ({ k: paintingKey(p.slug), name: p.title, kind: 'painting', url: p.small || p.src || '' })),
  ]
}

/** The storage paths of the drawings among these keys, so a room signs only what it shows. */
export function drawingFilesFor(keys, drawings = []) {
  const want = new Set(keys.filter((k) => typeof k === 'string' && k.startsWith(DRAWING)).map((k) => k.slice(2)))
  return drawings.filter((d) => want.has(d.id)).map(drawingFile).filter(Boolean)
}

/** The picture for an own-art key, or null while it's not found or not signed yet. */
export function artUrl(k, { drawings = [], paintings = [], urls = {} } = {}) {
  const a = parseArtKey(k)
  if (!a) return null
  if (a.kind === 'drawing') { const d = drawings.find((x) => x.id === a.id); return d ? urls[drawingFile(d)] || null : null }
  const p = paintings.find((x) => x.slug === a.id)
  return p ? p.small || p.src || null : null
}

/** The name to show for an own-art key. */
export function artName(k, { drawings = [], paintings = [] } = {}) {
  const a = parseArtKey(k)
  if (!a) return null
  const f = a.kind === 'drawing' ? drawings.find((x) => x.id === a.id) : paintings.find((x) => x.slug === a.id)
  return f ? f.title : a.kind === 'drawing' ? 'A drawing' : 'A painting'
}

/** The address of the piece's own page in Anna's Art or Laurie's Gallery (where Back comes home to the room), or null. */
export function artPath(k) {
  const a = parseArtKey(k)
  if (!a) return null
  return a.kind === 'drawing' ? '/drawings/' + a.id : '/lifelist/paintings/' + a.id
}

/** A piece's shape, width ÷ height, from what's kept about it (0.8 until it's known). */
export function artRatio(k, { drawings = [], paintings = [] } = {}) {
  const a = parseArtKey(k)
  if (!a) return 0.8
  const f = a.kind === 'drawing' ? drawings.find((x) => x.id === a.id) : paintings.find((x) => x.slug === a.id)
  const w = f && (a.kind === 'drawing' ? f.width : f.w), h = f && (a.kind === 'drawing' ? f.height : f.h)
  return w > 0 && h > 0 ? w / h : 0.8
}
