// ============================================
// make-icons.mjs -- every home-screen icon size from one square picture
// ============================================
// Usage, from the repository:  node scripts/make-icons.mjs docs/icon-options/sprout-leafy.png
// Writes public/icons/: 512 and 192 for the manifest, 180 for iPhones, 32
// for the browser tab, and a "maskable" 512 for Android, which sets the
// picture a little smaller on its own sky so a circle crop keeps all of it.
// Needs Playwright's Chromium (`npm i -D playwright && npx playwright install chromium`
// on a fresh computer); it draws the sizes in a browser canvas.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const SOURCE = path.resolve(process.argv[2] || 'docs/icon-options/sprout-outline.png')
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
// The repository's own Playwright if installed, else one installed for the whole computer.
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'))

const b = await chromium.launch(); const p = await b.newPage()
  const src = 'data:image/png;base64,' + fs.readFileSync(SOURCE).toString('base64');
  const out = await p.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    // Downscale by halves for clean edges
    const scaled = (size) => {
      let cur = img, w = img.width
      while (w / 2 >= size) { const c = document.createElement('canvas'); c.width = c.height = Math.round(w / 2); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height); cur = c; w = c.width }
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, size, size); return c
    }
    const res = {}
    for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) res[name] = scaled(size).toDataURL('image/png')
    // Maskable: the icon at 78% on its own sky, so a circle crop keeps the whole sprout
    const big = document.createElement('canvas'); big.width = big.height = img.width; const bx = big.getContext('2d'); bx.drawImage(img, 0, 0)
    const left = bx.getImageData(4, 0, 1, img.height).data, right = bx.getImageData(img.width - 5, 0, 1, img.height).data
    const m = document.createElement('canvas'); m.width = m.height = 1254; const mx = m.getContext('2d')
    const k = 0.78, s = 1254 * k, o = (1254 - s) / 2
    // The icon's own edge colours, stretched from where the scaled icon sits, so its edge meets the same colour
    const g = mx.createLinearGradient(0, 0, 0, 1254)
    for (let i = 0; i <= 40; i++) {
      const y = Math.max(0, Math.min(img.height - 1, Math.round(((i / 40) * 1254 - o) / k)))
      const c = [0, 1, 2].map((j) => Math.round((left[y * 4 + j] + right[y * 4 + j]) / 2))
      g.addColorStop(i / 40, `rgb(${c.join(',')})`)
    }
    mx.fillStyle = g; mx.fillRect(0, 0, 1254, 1254)
    // soft-edged so no seam shows where the icon meets the extended sky
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1254; const tx = tmp.getContext('2d')
    tx.drawImage(img, 0, 0); tx.globalCompositeOperation = 'destination-in'
    const mask = document.createElement('canvas'); mask.width = mask.height = 1254; const mk = mask.getContext('2d')
    mk.filter = 'blur(28px)'; mk.fillStyle = '#000'; mk.fillRect(50, 50, 1154, 1154) // only a thin feathered band at the very edge
    tx.drawImage(mask, 0, 0)
    mx.drawImage(tmp, o, o, s, s)
    const m512 = document.createElement('canvas'); m512.width = m512.height = 512; const m5 = m512.getContext('2d'); m5.imageSmoothingQuality = 'high'
    const half = document.createElement('canvas'); half.width = half.height = 627; half.getContext('2d').drawImage(m, 0, 0, 627, 627)
    m5.drawImage(half, 0, 0, 512, 512)
    res['icon-maskable-512.png'] = m512.toDataURL('image/png')
    return res
  }, src);
  for (const [name, url] of Object.entries(out)) fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'))
  await b.close();
  console.log(Object.keys(out).join(', '))
