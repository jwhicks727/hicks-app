import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  cellOf, validCellId, overpassQuery, shapeMap, shapeGeo, shapePages, shapeImages, sightsFrom, cleanGuide, searchedUrls, searchesIn,
  guideAsk, GUIDE_TOOL, SECTIONS, matchPlace, httpsUrl, DEFAULT_INTERESTS, GUIDES_A_DAY, MAP_CELLS_A_DAY, publicSite,
} from '../supabase/functions/_shared/around.js'
import { TASKS } from '../supabase/functions/_shared/claude.js'
import { cellIdOf, sectionOrder, ordered, startBy, hikeWords, shouldAsk, alsoOnTheMap, awayWords, mapsSearch } from '../src/lib/around.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('the functions hear only a tenth of a degree, and the phone works out the same area', () => {
  assert.deepEqual(cellOf(34.2439, -116.9114), { lat: 34.2, lng: -116.9, id: '34.2,-116.9' })
  for (const [lat, lng] of [[34.2439, -116.9114], [33.49, -117.15], [48.8566, 2.3522], [-33.87, 151.21]]) assert.equal(cellIdOf({ lat, lng }), cellOf(lat, lng).id)
  assert.equal(cellOf(NaN, 0), null)
  assert.ok(validCellId('34.2,-116.9') && !validCellId('34.24,-116.91') && !validCellId('home'))
  const re = new RegExp(/cell ~ '([^']+)'/.exec(src('supabase/migrations/20261107231000_around_here.sql'))[1])
  assert.ok(re.test('34.2,-116.9') && !re.test('34.24,-116.91'))
  const q = overpassQuery(cellOf(34.2439, -116.9114))
  assert.match(q, /around:15000,34\.2,-116\.9\)/)
  assert.ok(!/34\.24/.test(q), 'never a closer point')
  assert.ok(MAP_CELLS_A_DAY > 0 && GUIDES_A_DAY > 0 && GUIDES_A_DAY <= 6)
})

test('the open map is shaped as data: named places only, https links, nearest first, no repeats', () => {
  const cell = cellOf(34.24, -116.91)
  const map = shapeMap({ elements: [
    { type: 'node', id: 1, lat: 34.245, lon: -116.9, tags: { name: 'Pine Roasters', craft: 'coffee_roaster', opening_hours: 'Mo-Su 07:00-15:00', website: 'https://pine.example/' } },
    { type: 'way', id: 2, center: { lat: 34.3, lon: -116.95 }, tags: { name: 'Lake Brewing', craft: 'brewery', website: 'http://insecure.example/' } },
    { type: 'node', id: 3, lat: 34.2, lon: -116.9, tags: { craft: 'brewery' } },
    { type: 'node', id: 4, lat: 34.21, lon: -116.88, tags: { name: 'St. Joseph', amenity: 'place_of_worship', religion: 'christian', denomination: 'catholic' } },
    { type: 'node', id: 5, lat: 34.22, lon: -116.88, tags: { name: '<script>Records</script>', shop: 'music' } },
    { type: 'node', id: 6, lat: 34.246, lon: -116.9, tags: { name: 'Pine Roasters', craft: 'coffee_roaster' } },
    { type: 'node', id: 7, lat: 34.23, lon: -116.9, tags: { name: 'Somewhere else', shop: 'shoes' } },
  ] }, cell)
  assert.equal(map.coffee.length, 1)
  assert.equal(map.coffee[0].hours, 'Mo-Su 07:00-15:00')
  assert.equal(map.coffee[0].website, 'https://pine.example/')
  assert.equal(map.brewpubs[0].website, '', 'never a plain http link')
  assert.equal(map.brewpubs.length, 1, 'an unnamed place is left out')
  assert.equal(map.mass[0].name, 'St. Joseph')
  assert.equal(map.records[0].name, 'script Records /script')
  assert.equal(map.coffee[0].osm, 'https://www.openstreetmap.org/node/1')
  assert.equal(Object.values(map).flat().length, 4)
  assert.deepEqual(shapeMap(null, cell).coffee, [])
})

test('photos are kept only under an open licence, from Wikimedia’s own host, featured and quality pictures first', () => {
  const images = shapeImages({ query: { pages: [
    { title: 'File:Lake.jpg', categories: [{ title: 'Category:Quality images' }], imageinfo: [{ thumburl: 'https://upload.wikimedia.org/a/Lake.jpg', thumbwidth: 1200, thumbheight: 800, descriptionurl: 'https://commons.wikimedia.org/wiki/File:Lake.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="x">A. Photographer</a>' } } }] },
    { title: 'File:Logo.png', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/b/Logo.png', extmetadata: { LicenseShortName: { value: 'Fair use' } } }] },
    { title: 'File:Elsewhere.jpg', imageinfo: [{ thumburl: 'https://example.com/x.jpg', extmetadata: { LicenseShortName: { value: 'Public domain' } } }] },
    { title: 'File:Pd.jpg', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/c/Pd.jpg', extmetadata: { LicenseShortName: { value: 'Public domain' } } }] },
  ] } })
  assert.deepEqual(Object.keys(images).sort(), ['Lake.jpg', 'Pd.jpg'])
  assert.equal(images['Lake.jpg'].credit, 'A. Photographer · CC BY-SA 4.0')
  assert.equal(images['Lake.jpg'].best, true)
  assert.equal(images['Pd.jpg'].best, false)
  const geo = shapeGeo({ query: { geosearch: [{ pageid: 10, title: 'Big Bear Dam', dist: 2400 }, { pageid: 11, title: 'Lake', dist: 900 }, { pageid: 12, title: 'No page', dist: 100 }] } })
  const pages = shapePages({ query: { pages: [{ pageid: 10, title: 'Big Bear Dam', extract: 'A dam.', fullurl: 'https://en.wikipedia.org/wiki/Big_Bear_Dam', pageimage: 'Pd.jpg' }, { pageid: 11, title: 'Lake', extract: 'A lake.', fullurl: 'https://en.wikipedia.org/wiki/Lake', pageimage: 'Lake.jpg' }] } })
  const sights = sightsFrom(geo, pages, images)
  assert.deepEqual(sights.map((s) => s.title), ['Lake', 'Big Bear Dam'])
  assert.equal(sights[0].km, 0.9)
})

const searched = ['https://www.pine.example/about', 'https://trails.example/castle-rock', 'https://news.example/best-brewpubs']
const saved = {
  intro: 'A mountain lake town.',
  sections: [
    { key: 'coffee', items: [
      { name: 'Pine Roasters', why: 'They roast on site.', more: 'Small and friendly.', town: 'Big Bear Lake', website: 'https://pine.example/', family_friendly: 'yes', hike: null, sources: ['https://pine.example/about/'] },
      { name: 'Made Up Cafe', why: 'x', more: 'y', town: 'z', website: '', family_friendly: 'unknown', hike: null, sources: ['https://nowhere.example/'] },
    ] },
    { key: 'hikes', items: [{ name: 'Castle Rock Trail', why: 'Big views.', more: 'Steep.', town: 'Big Bear Lake', website: '', family_friendly: 'yes', hike: { length: 'short', miles: 2.4, climb_ft: 700, hours: 1.5, dogs: 'yes', ends_at: 'a granite outcrop' }, sources: ['https://trails.example/castle-rock'] }] },
    { key: 'not-a-section', items: [{ name: 'X', why: '', more: '', town: '', website: '', family_friendly: 'yes', hike: null, sources: searched }] },
    { key: 'brewpubs', items: Array.from({ length: 9 }, (_, i) => ({ name: `Pub ${i}`, why: '', more: '', town: '', website: 'javascript:alert(1)', family_friendly: 'no', hike: { length: 'long', miles: 99, climb_ft: 1, hours: 1, dogs: 'yes', ends_at: '' }, sources: ['https://news.example/best-brewpubs'] })) },
  ],
}

test('a guide is kept only with sources its own searches returned; checked, capped and matched to the open map', () => {
  const map = { coffee: [{ id: 'node/1', name: 'Pine Roasters', lat: 34.245, lng: -116.9, km: 0.6, hours: 'Mo-Su 07:00-15:00', website: 'https://pine.example/', osm: 'https://www.openstreetmap.org/node/1' }] }
  const g = cleanGuide(saved, searched, map)
  assert.equal(g.intro, 'A mountain lake town.')
  assert.deepEqual(g.sections.map((s) => s.key), ['hikes', 'coffee', 'brewpubs'], 'in the guide’s own order, unknown sections gone')
  const coffee = g.sections.find((s) => s.key === 'coffee')
  assert.deepEqual(coffee.items.map((i) => i.name), ['Pine Roasters'], 'a place with no searched source is left out')
  assert.equal(coffee.items[0].confirmed, true)
  assert.equal(coffee.items[0].hours, 'Mo-Su 07:00-15:00')
  assert.equal(coffee.items[0].lat, 34.245)
  const hike = g.sections.find((s) => s.key === 'hikes').items[0]
  assert.deepEqual(hike.hike, { length: 'short', miles: 2.4, climb: 700, hours: 1.5, dogs: 'yes', ends: 'a granite outcrop' })
  assert.equal(hike.confirmed, false)
  const pubs = g.sections.find((s) => s.key === 'brewpubs').items
  assert.equal(pubs.length, 6, 'six a section at most')
  assert.equal(pubs[0].hike, null, 'hike figures only on hikes')
  assert.equal(pubs[0].website, '', 'never a javascript: link')
  assert.deepEqual(cleanGuide(null, searched).sections, [])
  assert.deepEqual(cleanGuide(saved, []).sections, [], 'with no searches, nothing survives')
})

test('the searches Claude ran are read from its own results, and counted for the caps', () => {
  const urls = searchedUrls([
    { type: 'text', text: 'x' },
    { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://a.example/1' }, { type: 'web_search_result', url: 'https://b.example/2' }] },
    { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } },
    { type: 'web_fetch_tool_result', content: { type: 'web_fetch_result', url: 'https://c.example/3' } },
  ])
  assert.deepEqual(urls, ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'])
  assert.equal(searchesIn({ server_tool_use: { web_search_requests: 7 } }), 7)
  assert.equal(searchesIn({}), 0)
})

test('what Claude is asked: the place, the season and the interests, and nothing about who is there', () => {
  const ask = guideAsk({ town: 'Big Bear Lake', region: 'California', cell: cellOf(34.24, -116.91), date: '2026-11-07', interests: '', map: { coffee: [{ name: 'Pine Roasters', km: 0.6 }] }, sights: [{ title: 'Big Bear Dam' }] })
  assert.match(ask, /Big Bear Lake, California \(about 34\.2, -116\.9/)
  assert.ok(ask.includes(DEFAULT_INTERESTS), 'the starting words when none are saved')
  assert.match(ask, /Pine Roasters \(coffee, 0\.6 km\)/)
  assert.match(ask, /save_guide/)
  assert.ok(!/34\.24/.test(ask))
  assert.equal(guideAsk({ town: 'X', cell: cellOf(1, 1), date: 'd', interests: 'y'.repeat(5000) }).match(/y{100,}/)[0].length, 1500)
})

test('the guide’s one tool is strict and closed all the way down, and its task is the family’s', () => {
  assert.equal(GUIDE_TOOL.strict, true)
  const walk = (s, path = 'root') => {
    if (!s || typeof s !== 'object') return
    if (s.type === 'object') { assert.equal(s.additionalProperties, false, path); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), path) }
    for (const [k, v] of Object.entries(s.properties || {})) walk(v, `${path}.${k}`)
    if (s.items) walk(s.items, `${path}[]`)
    for (const a of s.anyOf || []) walk(a, path)
  }
  walk(GUIDE_TOOL.input_schema)
  assert.deepEqual(GUIDE_TOOL.input_schema.properties.sections.items.properties.key.enum, Object.keys(SECTIONS))
  assert.equal(TASKS['around-here'].who, 'family')
  assert.match(TASKS['around-here'].says, /town/)
})

test('the claude function writes one guide at a time per area, a few a day, inside the caps, and keeps it by place only', () => {
  const s = src('supabase/functions/claude/index.ts')
  assert.match(s, /if \(body\.task === 'around-here'\) return await aroundHere/)
  assert.match(s, /BUILDING_STALE_MS\) return reply\(200, \{ status: 'building'/)
  assert.match(s, /GUIDES_A_DAY\) return reply/)
  assert.match(s, /costCents\(u\) \+ searchesIn\(u\) \* SEARCH_CENTS/)
  assert.match(s, /type: 'web_search_20260209', name: 'web_search', max_uses: 12/)
  assert.ok(!/member_id|my_member_id/.test(s.slice(s.indexOf('async function aroundHere'))), 'a guide never records who asked')
  const m = src('supabase/migrations/20261107231000_around_here.sql')
  assert.match(m, /grant select on public\.area_guides to authenticated;/)
  assert.ok(!/grant[^;]*(insert|update|delete)[^;]*area_guides/i.test(m), 'only the functions write guides')
  const r = src('src/consoles/Reports.jsx')
  const report = r.slice(r.indexOf('function GuidesReport'), r.indexOf('const BUILT'))
  assert.ok(!/town|cell/.test(report.replace(/never which places/g, '')), 'Reports counts guides, never names the places')
})

test('on the phone: the moment decides the order, hikes say when to set off, and a guide is asked for once a day at most', () => {
  assert.equal(sectionOrder({ hour: 8 })[0], 'coffee')
  assert.equal(sectionOrder({ hour: 19 })[0], 'local-food')
  assert.equal(sectionOrder({ hour: 19, rainy: true })[0], 'books-records')
  assert.equal(sectionOrder({ hour: 9, weekday: 0 })[0], 'mass')
  assert.equal(sectionOrder({ hour: 16, weekday: 6 })[0], 'mass')
  assert.equal(sectionOrder({ hour: 16, weekday: 3 })[0], 'hikes')
  assert.deepEqual(ordered([{ key: 'sky' }, { key: 'coffee' }, { key: 'zzz' }], sectionOrder({ hour: 8 })).map((s) => s.key), ['coffee', 'sky', 'zzz'])
  const sunset = new Date('2026-11-07T16:48:00-08:00'), now = new Date('2026-11-07T10:00:00-08:00')
  const t = startBy({ hours: 3 }, sunset, now)
  assert.equal(t.toISOString(), new Date('2026-11-07T13:15:00-08:00').toISOString())
  assert.equal(startBy({ hours: 8 }, sunset, now), null, 'no time today')
  assert.equal(startBy(null, sunset, now), null)
  assert.equal(hikeWords({ miles: 4.8, climb: 1200, hours: 3, dogs: 'yes' }), '4.8 mi · 1,200 ft up · about 3 hr · dogs welcome')
  assert.equal(hikeWords({ hours: 0.5, dogs: 'no' }), 'about 30 min · no dogs')
  const today = '2026-11-07'
  assert.equal(shouldAsk({ guide: null, askedOn: null, today }), true)
  assert.equal(shouldAsk({ guide: null, askedOn: today, today }), false)
  assert.equal(shouldAsk({ guide: { status: 'building' }, today }), false)
  assert.equal(shouldAsk({ guide: { status: 'ready', fetched_at: new Date().toISOString() }, today }), false)
  assert.equal(shouldAsk({ guide: { status: 'ready', fetched_at: new Date(Date.now() - 40 * 864e5).toISOString() }, today }), true)
  assert.equal(awayWords({ lat: 34.25, lng: -116.9 }, { lat: 34.24, lng: -116.91 }), '0.9 mi away')
  assert.equal(awayWords({ lat: null, lng: null }, { lat: 1, lng: 1 }), '')
  const also = alsoOnTheMap({ coffee: [{ id: 'a', name: 'Pine Roasters', km: 1 }, { id: 'b', name: 'Other Roasters', km: 3 }], books: [{ id: 'c', name: 'Lake Books', km: 2 }] }, { sections: [{ items: [{ name: 'Pine Roasters' }] }] })
  assert.deepEqual(also.map((p) => p.id), ['c', 'b'])
  assert.equal(mapsSearch('Pine Roasters', 'Big Bear Lake'), 'https://maps.google.com/?q=Pine%20Roasters%2C%20Big%20Bear%20Lake')
  assert.equal(httpsUrl('http://x.example'), '')
  assert.equal(matchPlace('The Pine Roasters Co.', { coffee: [{ name: 'Pine Roasters' }] }).name, 'Pine Roasters')
  assert.equal(matchPlace('ab', { coffee: [{ name: 'ab' }] }), null)
})

test('a place’s own website is fetched for its picture only when it is an ordinary public site', () => {
  for (const ok of ['https://pine.example/', 'https://www.lakebrewing.com/menu']) assert.equal(publicSite(ok), true, ok)
  for (const bad of ['http://pine.example/', 'https://127.0.0.1/', 'https://localhost/', 'https://printer.local/', 'https://10.0.0.5/x', 'https://[::1]/', 'https://intranet/', 'https://pine.example:8443/', 'javascript:alert(1)', '']) assert.equal(publicSite(bad), false, bad)
  const s = src('supabase/functions/claude/index.ts')
  assert.match(s, /it\.website && publicSite\(it\.website\)/)
  assert.match(s, /!res\.ok \|\| !publicSite\(res\.url\)/, 'a redirect may not land somewhere private')
})

