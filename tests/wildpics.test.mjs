import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { WILD_SOURCES, previewImage, isPicture, sameSite, cleanPictures, entryFor } from '../supabase/functions/_shared/wildpics.js'
import { observancesOn } from '../src/lib/cal/observances.js'

test('every wild season that links to a site is read from the first site it links to', () => {
  const src = fs.readFileSync(new URL('../src/lib/cal/observances.js', import.meta.url), 'utf8')
  for (const [id, [page]] of Object.entries(WILD_SOURCES)) {
    const line = src.split('\n').find((l) => l.includes(`['${id}', 'wild'`))
    assert.ok(line, `${id} is a wild season`)
    assert.ok(line.includes(`'${page}'`), `${id}: its card links to ${page}`)
  }
  assert.ok(typeof observancesOn === 'function')
})

test('the preview picture a page names, only from its own site, never a logo or an icon', () => {
  const page = 'https://www.example-eagles.org/'
  const html = (m) => `<html><head><title>x</title>${m}</head><body></body></html>`
  assert.equal(previewImage(html('<meta property="og:image" content="https://www.example-eagles.org/img/nest.jpg">'), page), 'https://www.example-eagles.org/img/nest.jpg')
  assert.equal(previewImage(html('<meta content="/img/nest.jpg" property="og:image" />'), page), 'https://www.example-eagles.org/img/nest.jpg', 'relative, attributes either way round')
  assert.equal(previewImage(html('<meta name="twitter:image" content="https://cdn.example-eagles.org/a.png?x=1&amp;y=2">'), page), 'https://cdn.example-eagles.org/a.png?x=1&y=2', 'a subdomain of the site is its own')
  assert.equal(previewImage(html('<meta property="og:image" content="https://elsewhere.net/a.jpg">'), page), null, 'another site’s picture is not used')
  assert.equal(previewImage(html('<meta property="og:image" content="http://www.example-eagles.org/a.jpg">'), page), null, 'https only')
  assert.equal(previewImage(html('<meta property="og:image" content="/assets/logo.png">'), page), null)
  assert.equal(previewImage(html('<meta property="og:image" content="/favicon.svg">'), page), null)
  assert.equal(previewImage(html('<meta property="og:image" content="javascript:alert(1)">'), page), null)
  assert.equal(previewImage(html('<meta property="og:image" content="https://user:pw@www.example-eagles.org/a.jpg">'), page), null)
  assert.equal(previewImage(html('<meta property="og:title" content="no picture">'), page), null)
  assert.equal(previewImage('', page), null); assert.equal(previewImage(null, page), null)
  assert.equal(previewImage(html('<meta property="og:image" content="https://pics.partner.org/a.jpg">'), page, ['pics.partner.org']), 'https://pics.partner.org/a.jpg')
})

test('a real picture, a sensible size; the site’s own host', () => {
  assert.equal(isPicture('image/jpeg', '120000'), true); assert.equal(isPicture('image/webp', null), true)
  assert.equal(isPicture('text/html', '120000'), false); assert.equal(isPicture('image/png', '90'), false); assert.equal(isPicture('image/jpeg', String(20e6)), false)
  assert.equal(sameSite('www.birdcast.info', 'https://birdcast.info/'), true); assert.equal(sameSite('evilbirdcast.info', 'https://birdcast.info/'), false)
})

test('only known seasons and https addresses reach the app, with the site’s own credit', () => {
  const out = cleanPictures({ eagles: { url: 'https://www.friendsofbigbearvalley.org/a.jpg', credit: 'I made this up' }, nonsense: { url: 'https://x.org/a.jpg' }, monarchs: { url: 'http://x.org/a.jpg' }, grunion: null })
  assert.deepEqual(Object.keys(out), ['eagles']); assert.equal(out.eagles.credit, 'Friends of Big Bear Valley'); assert.equal(entryFor('whales', 'https://x/y.jpg').page, 'https://www.acs-la.org/')
})
