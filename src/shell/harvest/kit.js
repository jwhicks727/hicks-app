// ============================================
// kit.js -- what every Thanksgiving show shares: find the painting, read it, cut leaves, run a loop
// ============================================
// DOM work only (the sums are in src/lib/harvest.js, waterway.js and leafCut.js, which are tested). Everything a show
// moves is a copy of her pixels, over a painting that stays whole; nothing is drawn or generated, nothing leaves the phone.
import { cropFor, paintingBySlug } from '../../lib/paintings.js'
import { findWaterway, WATER_WORK } from '../../lib/waterway.js'
import { findFire, goldShare } from '../../lib/harvest.js'
import { cutLeaves, leavesRow, LEAF_WORK } from '../../lib/leafCut.js'
import { originInFrame, paintedWidth } from '../../lib/wind.js'

export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
export const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/** The painting hanging in view on this screen: one of the sheets' paintings if it is, else any (`frame`, its box, its painting). */
export function findFrame(list, prefer = []) {
  const vh = window.innerHeight
  const frames = [...document.querySelectorAll('.pf[data-art-slug]')].map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((f) => f.r.width > 120 && f.r.height > 120 && f.r.bottom > 80 && f.r.top < vh - 80)
  const f = frames.find((x) => prefer.includes(x.el.dataset.artSlug)) || frames[0]
  if (!f) return null
  const p = paintingBySlug(f.el.dataset.artSlug, list)
  return p ? { el: f.el, p } : null
}

/** A painting's frame now: its size, its place on the screen, and where her painting sits inside it. */
export function frameGeometry(el, p) {
  const W = el.clientWidth, H = el.clientHeight, r = el.getBoundingClientRect()
  return { W, H, r, crop: cropFor(p, W, H, p.focus) }
}

// A small copy of her painting, once: its picture (for cutting pieces), and what its colours say
const looked = new Map()
export function lookAt(p) {
  const url = p.small || p.src
  if (!url) return Promise.resolve(null)
  const key = `${p.slug}:${url}`
  if (!looked.has(key)) {
    looked.set(key, (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const bmp = await createImageBitmap(await res.blob())
        const s = WATER_WORK / Math.max(bmp.width, bmp.height), w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s))
        const c = document.createElement('canvas'); c.width = w; c.height = h
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, w, h)
        const px = g.getImageData(0, 0, w, h)
        c.width = 0; c.height = 0
        return { bmp, way: findWaterway(px), fire: findFire(px), gold: goldShare(px) }
      } catch { return null }
    })())
  }
  return looked.get(key)
}

// Leaves cut from the painting in view, on the phone, once (as the cut-leaves button on its page does)
const cut = new Map()
export function leavesOf(p) {
  if (p.leaves && p.leaves.sheet && p.leaves.boxes && p.leaves.boxes.length) return Promise.resolve(null) // already has its own, which the show uses
  const key = `${p.slug}:${p.src}`
  if (!cut.has(key)) {
    cut.set(key, (async () => {
      try {
        const res = await fetch(p.src)
        if (!res.ok) return null
        const bmp = await createImageBitmap(await res.blob())
        const s = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)), w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s))
        const c = document.createElement('canvas'); c.width = w; c.height = h
        c.getContext('2d').drawImage(bmp, 0, 0, w, h)
        if (bmp.close) bmp.close()
        const px = c.getContext('2d').getImageData(0, 0, w, h)
        c.width = 0; c.height = 0
        await new Promise((ok) => setTimeout(ok, 30))
        const out = cutLeaves(px, { count: 36, seed: 5 })
        if (out.boxes.length < 6) return null
        const sheet = document.createElement('canvas'); sheet.width = out.sheet.width; sheet.height = out.sheet.height
        sheet.getContext('2d').putImageData(new ImageData(out.sheet.data, out.sheet.width, out.sheet.height), 0, 0)
        const blob = await new Promise((ok) => sheet.toBlob(ok, 'image/png'))
        sheet.width = 0; sheet.height = 0
        if (!blob) return null
        const row = leavesRow(out, { workWidth: w, workHeight: h, paintingWidth: p.w, today: '', seed: 5 })
        return { slug: p.slug, sheet: URL.createObjectURL(blob), size: row.size, boxes: row.boxes, px: row.px, scale: row.scale, origins: { scale: row.originScale, origins: row.origins } }
      } catch { return null }
    })())
  }
  return cut.get(key)
}

/** The leaf sheets a show uses: the painting's own (cut here or kept with its row) first, then the season's others. */
export async function sheetsFor(p, show) {
  const mine = await leavesOf(p)
  const own = mine || (p.leaves && p.leaves.sheet ? show.sheets.find((s) => s.slug === p.slug) : null)
  return [own, ...show.sheets.filter((s) => !own || s.slug !== own.slug)].filter(Boolean).slice(0, 3)
}

/** A leaf element cut from a sheet, at a size. */
export function makeLeaf(layer, sh, bi, kk) {
  const box = sh.boxes[bi]
  const el = document.createElement('i')
  el.className = 'hv-piece'
  el.style.width = `${box[2] * kk}px`; el.style.height = `${box[3] * kk}px`
  el.style.backgroundImage = `url(${sh.sheet})`
  el.style.backgroundSize = `${sh.size[0] * kk}px ${sh.size[1] * kk}px`
  el.style.backgroundPosition = `${-box[0] * kk}px ${-box[1] * kk}px`
  el.style.opacity = '0'
  layer.appendChild(el)
  return { el, w: box[2] * kk, h: box[3] * kk, box }
}
export const baseSize = (sh) => (sh.scale[0] + (sh.scale[1] - sh.scale[0]) * 0.1) / sh.px * 0.85

/**
 * Where each leaf was painted, in the frame: [{ si, bi, x, y, k0 }] for the sheets that belong to a painting hanging
 * in view (x, y in px from the frame's corner; k0 the share of its size it has where it was painted), shuffled, and
 * leaving out any under Anna's paper taped over the frame.
 */
export function spotsIn(sheets, list, geo) {
  const covers = [...document.querySelectorAll('[data-art-cover]')].map((e) => e.getBoundingClientRect())
  const out = []
  for (const [si, sh] of sheets.entries()) {
    const p = paintingBySlug(sh.slug, list), fr = document.querySelector(`.pf[data-art-slug="${sh.slug}"]`)
    if (!sh.origins || !p || !fr) continue
    const fw = fr.clientWidth, fh = fr.clientHeight, fb = fr.getBoundingClientRect(), crop = cropFor(p, fw, fh, p.focus)
    for (const [bi, og] of sh.origins.origins.entries()) {
      const at = originInFrame(crop, og, fw, fh)
      if (!at || bi >= sh.boxes.length) continue
      const x = fb.left + at.x - geo.r.left, y = fb.top + at.y - geo.r.top
      if (covers.some((c) => geo.r.left + x > c.left - 8 && geo.r.left + x < c.right + 8 && geo.r.top + y > c.top - 8 && geo.r.top + y < c.bottom + 8)) continue
      out.push({ si, bi, x, y, k0w: paintedWidth(sh.boxes[bi], sh.origins.scale, crop, p.w) })
    }
  }
  return shuffle(out)
}

/** A loop that sleeps with the app: update(dt, t) returns false when the show is done. Returns its stop. */
export function stage(update) {
  let raf = 0, last = 0, t = 0, dead = false
  const step = (stamp) => {
    raf = 0
    if (dead) return
    const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
    last = stamp
    if (document.visibilityState === 'visible') t += dt
    if (update(dt, t) === false) return
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => { dead = true; cancelAnimationFrame(raf) }
}

/** The frame's box now (read once a frame), or null if the painting has left. */
export const boxOf = (el) => (el && el.isConnected ? el.getBoundingClientRect() : null)

/** Write one piece's place: transforms and opacity only. */
export function put(lf, r, p) {
  lf.el.style.opacity = p.op.toFixed(3)
  lf.el.style.transform = `translate3d(${(r.left + p.x - lf.w / 2).toFixed(1)}px, ${(r.top + p.y - lf.h / 2).toFixed(1)}px, 0) rotate(${(p.rot || 0).toFixed(1)}deg) rotateX(${(p.tilt || 0).toFixed(1)}deg) rotateY(${(p.yaw || 0).toFixed(1)}deg) scale(${(p.k == null ? 1 : p.k).toFixed(3)})`
}
