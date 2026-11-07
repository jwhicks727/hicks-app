// ============================================
// paintingPhotos.js -- the canvas work for adding Laurie's paintings: open, shrink, crop
// ============================================
// The sums are in src/lib/paintingBatch.js (tested); this only draws. Every
// picture is made from the photo by cropping, turning and shrinking: nothing
// of hers is altered. One canvas job runs at a time (`oneAtATime`), since a
// phone has little memory for big pictures, and each canvas is emptied after.
import { SIZES, drawTransform, signatureCorners } from '../../lib/paintingBatch.js'

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const free = (c) => { if (c && c.getContext) { c.width = 0; c.height = 0 } }

let chain = Promise.resolve()
/** Run canvas work one job at a time, in the order asked. */
export function oneAtATime(job) {
  const run = chain.then(job, job)
  chain = run.catch(() => {})
  return run
}

/** A photo or a kept copy, opened the right way up: { img, width, height, close }. */
export async function openPicture(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    try {
      const bm = await createImageBitmap(blob)
      return { img: bm, width: bm.width, height: bm.height, close: () => bm.close() }
    } catch {
      throw new Error('This browser can’t open that photo. An iPhone’s HEIC photo opens on the iPhone; on a computer, save it as a JPEG first.')
    }
  }
}

/** The picture shrunk to fit `max` on its long side, halving in steps so fine brushwork doesn't shimmer. */
export function shrink(src, w, h, max) {
  const k = Math.min(1, max / Math.max(w, h)), tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k))
  let cur = src, cw = w, ch = h
  while (cw / 2 >= tw && ch / 2 >= th) {
    const c = canvas(Math.round(cw / 2), Math.round(ch / 2)), x = c.getContext('2d')
    x.imageSmoothingQuality = 'high'
    x.drawImage(cur, 0, 0, c.width, c.height)
    if (cur !== src) free(cur)
    cur = c; cw = c.width; ch = c.height
  }
  const out = canvas(tw, th), x = out.getContext('2d')
  x.imageSmoothingQuality = 'high'
  x.drawImage(cur, 0, 0, tw, th)
  if (cur !== src) free(cur)
  return out
}

const toBlob = (c, quality) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('The phone ran out of memory making the picture'))), 'image/jpeg', quality))
const toBase64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(r.error); r.readAsDataURL(blob) })

/**
 * A photo made ready: the copy kept on the phone (3600 px, enough for the 2400 px painting once
 * cropped), a view for the crop screen, a thumbnail, and the little copy the auto-crop measures.
 */
export async function preparePhoto(file) {
  const pic = await openPicture(file)
  const made = []
  try {
    const kept = shrink(pic.img, pic.width, pic.height, SIZES.kept); made.push(kept)
    const view = shrink(kept, kept.width, kept.height, SIZES.view); made.push(view)
    const thumb = shrink(view, view.width, view.height, SIZES.thumb); made.push(thumb)
    const look = shrink(view, view.width, view.height, SIZES.look); made.push(look)
    const pixels = look.getContext('2d').getImageData(0, 0, look.width, look.height)
    return { kept: await toBlob(kept, 0.92), view: await toBlob(view, 0.86), thumb: await toBlob(thumb, 0.8), W: kept.width, H: kept.height, look: pixels }
  } finally {
    made.forEach(free)
    pic.close()
  }
}

/** The painting drawn out of the kept copy by its crop (or one region of it), at most `max` on its long side. */
function drawPainting(pic, crop, opts) {
  const t = drawTransform(crop, pic.width, pic.height, opts)
  const c = canvas(t.width, t.height), x = c.getContext('2d')
  x.imageSmoothingQuality = 'high'
  x.setTransform(t.a, t.b, t.c, t.d, t.e, t.f)
  x.drawImage(pic.img, 0, 0, pic.width, pic.height)
  return c
}

/** Her gallery's two files: full.jpg (2400 px) and small.jpg (720 px), with the full one's size. */
export async function paintingFiles(kept, crop) {
  const pic = await openPicture(kept)
  let full, small
  try {
    full = drawPainting(pic, crop, { max: SIZES.full })
    small = shrink(full, full.width, full.height, SIZES.small)
    return { full: await toBlob(full, 0.88), small: await toBlob(small, 0.84), w: full.width, h: full.height }
  } finally {
    free(full); free(small); pic.close()
  }
}

/** What goes to Claude to read: the cropped painting, then each corner enlarged, as JPEG. */
export async function readingFiles(kept, crop) {
  const pic = await openPicture(kept)
  const out = []
  try {
    for (const opts of [{ max: SIZES.read }, ...signatureCorners(crop.w, crop.h).map((region) => ({ max: SIZES.corner, region }))]) {
      const c = drawPainting(pic, crop, opts)
      try { out.push({ data: await toBase64(await toBlob(c, 0.86)), media_type: 'image/jpeg' }) } finally { free(c) }
    }
    return out
  } finally {
    pic.close()
  }
}
