import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOLD_MS, heldStill, pieceFileName, pieceAddress, extOf, abilities } from '../src/lib/pieceMenu.js'

test('a hold is a finger kept nearly still', () => {
  assert.ok(HOLD_MS >= 400 && HOLD_MS <= 700)
  assert.ok(heldStill({ x: 0, y: 0 }, { x: 4, y: 4 }))
  assert.ok(!heldStill({ x: 0, y: 0 }, { x: 0, y: 30 })) // a scroll
})

test('a saved file is named for the piece and whose it is', () => {
  assert.equal(pieceFileName('Crow & Moon / 2', 'Laurie', 'image/jpeg'), 'Crow-Moon-2-by-Laurie.jpg')
  assert.equal(pieceFileName('Café', 'Anna', 'image/png'), 'Cafe-by-Anna.png')
  assert.equal(pieceFileName('///', 'Anna', 'image/webp'), 'art-by-Anna.webp')
  assert.equal(extOf('text/html'), 'jpg')
})

test('the link copied is the app’s page, never a file link', () => {
  assert.equal(pieceAddress('https://hicks.web.app/', '/drawings/abc'), 'https://hicks.web.app/drawings/abc')
})

test('the menu offers only what the device can do', () => {
  const none = abilities({ navigator: {}, document: {} })
  assert.deepEqual(none, { download: true, copyImage: false, copyLink: false, share: false })
  const all = abilities({ navigator: { clipboard: { write() {}, writeText() {} }, share() {} }, ClipboardItem: class {}, document: {} })
  assert.ok(all.copyImage && all.copyLink && all.share)
})

test('both walls hold-to-open, and the big pages have a tap way in', () => {
  const read = (f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')
  assert.match(read('places/Drawings.jsx'), /<HeldLink[^>]*className="ag-piece"/)
  assert.match(read('places/Drawings.jsx'), /<PieceMenuButton/)
  const g = read('places/lifelist/Gallery.jsx')
  assert.match(g, /<HeldLink[^>]*gallery-piece/)
  assert.match(g, /<HeldLink[^>]*gf-piece/)
  assert.match(read('places/lifelist/PaintingPage.jsx'), /<PieceMenuButton/)
  // the signed file link is never what's copied
  assert.doesNotMatch(read('ui/PieceMenu.jsx'), /writeText\(src|address: src/)
})
