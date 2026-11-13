// Anna's drawings and Laurie's paintings as things to place in an academy room.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isOwnArt, parseArtKey, drawingKey, paintingKey, artList, artUrl, artName, drawingFilesFor, artPath } from '../src/academy/ownArt.js'
import { gait, glowOf } from '../src/academy/life.js'

const drawings = [{ id: 'd1', title: 'Cats', path: 'd1.jpg', thumb_path: 'd1.thumb.jpg' }, { id: 'd2', title: 'Sun', path: 'd2.jpg', thumb_path: null }]
const paintings = [{ slug: 'crow', title: 'Crow', small: 'https://x/crow-small.webp', src: 'https://x/crow.webp' }]

test('keys tell a drawing, a painting, and everything else apart', () => {
  assert.equal(drawingKey('d1'), 'd:d1'); assert.equal(paintingKey('crow'), 'p:crow')
  assert.ok(isOwnArt('d:d1') && isOwnArt('p:crow')); assert.ok(!isOwnArt('a:123') && !isOwnArt('cat') && !isOwnArt(null))
  assert.deepEqual(parseArtKey('p:crow'), { kind: 'painting', id: 'crow' }); assert.equal(parseArtKey('cat'), null)
})

test('everything is offered, and only what a room shows is signed', () => {
  const l = artList(drawings, paintings)
  assert.equal(l.length, 3)
  assert.deepEqual(l.map((x) => x.kind), ['drawing', 'drawing', 'painting'])
  assert.equal(l[1].file, 'd2.jpg')
  assert.deepEqual(drawingFilesFor(['d:d1', 'p:crow', 'cat'], drawings), ['d1.thumb.jpg'])
})

test('a picture is found by its key; a taken-down one is just missing', () => {
  const src = { drawings, paintings, urls: { 'd1.thumb.jpg': 'https://signed/d1' } }
  assert.equal(artUrl('d:d1', src), 'https://signed/d1'); assert.equal(artUrl('d:d2', src), null)
  assert.equal(artUrl('p:crow', src), 'https://x/crow-small.webp'); assert.equal(artUrl('p:gone', src), null)
  assert.equal(artName('d:d1', src), 'Cats'); assert.equal(artName('p:gone', src), 'A painting')
})

test('they sit still and give no light, and are never recoloured or flipped', () => {
  assert.equal(gait('d:d1'), null); assert.equal(glowOf('p:crow'), null)
  const scene = fs.readFileSync('src/academy/RoomScene.jsx', 'utf8')
  assert.match(scene, /it\.h && !art/); assert.match(scene, /it\.f && !art/)
  assert.match(fs.readFileSync('src/academy/RoomPage.jsx', 'utf8'), /!isOwnArt\(it\.k\) && <button[\s\S]*?>Colour<\/button>/)
})

test('a placed piece opens its own page, and only art does', () => {
  assert.equal(artPath('d:d1'), '/drawings/d1'); assert.equal(artPath('p:crow'), '/lifelist/paintings/crow'); assert.equal(artPath('cat'), null)
})
