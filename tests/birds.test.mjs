// The week's birds, from answers shaped like eBird's API 2.0 and iNaturalist's taxa (made up)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recentUrl, notableUrl, shapeBirds, photoOf } from '../supabase/functions/_shared/birds.js'
import { seenWhen } from '../src/lib/birdWords.js'

const o = (code, name, dt, extra = {}) => ({ speciesCode: code, comName: name, sciName: 'Genus ' + code, locId: 'L1', locName: 'Fontana Park', obsDt: dt, howMany: 2, lat: 34.1, lng: -117.4, obsValid: true, obsReviewed: false, locationPrivate: false, subId: 'S123456', ...extra })

test('asks about the town’s centre, near for the week and a little further for the notable', () => {
  const r = new URL(recentUrl({ lat: 34.0922, lng: -117.435 })), n = new URL(notableUrl({ lat: 34.0922, lng: -117.435 }))
  assert.equal(r.searchParams.get('lat'), '34.09'); assert.equal(r.searchParams.get('back'), '7')
  assert.ok(n.pathname.endsWith('/notable')); assert.equal(n.searchParams.get('detail'), 'simple')
})

test('one entry a species, notable first, then the most often seen; a private place stays unnamed', () => {
  const recent = [
    o('annhum', 'Anna’s Hummingbird', '2026-10-30 08:10'), o('annhum', 'Anna’s Hummingbird', '2026-10-31 07:40', { howMany: 3 }),
    o('houfin', 'House Finch', '2026-10-29 09:00', { locationPrivate: true, locName: 'Someone’s yard' }),
    o('bad code!', 'Nope', '2026-10-31 07:00'),
  ]
  const notable = [o('vermfly', 'Vermilion Flycatcher', '2026-10-30 16:00', { howMany: 1 })]
  const b = shapeBirds(recent, notable)
  assert.deepEqual(b.map((x) => x.code), ['vermfly', 'annhum', 'houfin'])
  assert.equal(b[1].count, 3); assert.equal(b[1].last, '2026-10-31 07:40'); assert.equal(b[1].sightings, 2)
  assert.equal(b[2].where, null); assert.equal(b[2].checklist, null)
  assert.equal(b[0].notable, true)
})

test('a photo only with a Creative Commons licence, from iNaturalist’s own hosts, with its credit', () => {
  const ok = { results: [{ default_photo: { license_code: 'cc-by-nc', medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg', attribution: '(c) A. Birder, some rights reserved (CC BY-NC)' } }] }
  assert.deepEqual(photoOf(ok), { url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg', credit: '(c) A. Birder, some rights reserved (CC BY-NC)', licence: 'CC-BY-NC' })
  assert.equal(photoOf({ results: [{ default_photo: { license_code: null, medium_url: ok.results[0].default_photo.medium_url } }] }), null)
  assert.equal(photoOf({ results: [{ default_photo: { license_code: 'cc0', medium_url: 'https://elsewhere.example/x.jpg' } }] }), null)
  assert.equal(photoOf({ results: [] }), null)
})

test('when it was seen, in days at home', () => {
  assert.equal(seenWhen('2026-10-31 07:40', '2026-10-31'), 'today')
  assert.equal(seenWhen('2026-10-30 16:00', '2026-10-31'), 'yesterday')
  assert.equal(seenWhen('2026-10-27 08:00', '2026-10-31'), '4 days ago')
})
