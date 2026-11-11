// Draws the academy's catalog pictures from Microsoft's Fluent Emoji (MIT licence) into
// public/academy/items/<key>.webp, 160px square, and writes the licence beside them.
//
// Usage, from the repository (needs Playwright's Chromium, as scripts/make-icons.mjs does):
//   npm pack @iconify-json/fluent-emoji@1.2.7          (in a scratch folder: it's data, ~100 MB)
//   tar -xzf iconify-json-fluent-emoji-1.2.7.tgz
//   node scripts/academy-art.mjs <scratch folder>/package/icons.json [key ...]
// Name keys after the JSON to draw only those (the rest are left as they are).
// Only the JSON is read; nothing from the package runs. The list of pictures is
// src/academy/items.js, so adding an item there and running this again adds its picture.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'))
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ITEMS } = await import(pathToFileURL(path.join(root, 'src', 'academy', 'items.js')).href)
const set = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const out = path.join(root, 'public', 'academy', 'items')
fs.mkdirSync(out, { recursive: true })

const svgOf = (k) => {
  const icon = set.icons[k] || (set.aliases && set.aliases[k] && set.icons[set.aliases[k].parent])
  if (!icon) return null
  const w = icon.width || set.width || 32, h = icon.height || set.height || 32
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left || 0} ${icon.top || 0} ${w} ${h}" width="160" height="160">${icon.body}</svg>`
}

const b = await chromium.launch()
const p = await b.newPage()
let n = 0
const only = process.argv.slice(3)
for (const { k } of ITEMS) {
  if (only.length && !only.includes(k)) continue
  const svg = svgOf(k)
  if (!svg) { console.warn('not in the set:', k); continue }
  const data = await p.evaluate(async (s) => {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)
    await img.decode()
    const c = document.createElement('canvas'); c.width = c.height = 160
    c.getContext('2d').drawImage(img, 0, 0, 160, 160)
    return c.toDataURL('image/webp', 0.88)
  }, svg)
  fs.writeFileSync(path.join(out, k + '.webp'), Buffer.from(data.split(',')[1], 'base64'))
  n++
}
await b.close()
fs.writeFileSync(path.join(root, 'public', 'academy', 'LICENSE-fluent-emoji.txt'), `The pictures in items/ are from Fluent Emoji by Microsoft Corporation
(https://github.com/microsoft/fluentui-emoji), drawn to WebP by scripts/academy-art.mjs
from the Iconify package @iconify-json/fluent-emoji@1.2.7.

MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`)
console.log(`${n} pictures in public/academy/items`)
