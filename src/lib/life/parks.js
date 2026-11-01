// ============================================
// parks.js -- the national parks, and which ones we've been to
// ============================================
// Pure: tests/life-list.test.mjs. The sixty-three national parks by their own
// names (the National Park Service's list), each with its state(s) and a
// region to group by. Visits are ours alone, in public.park_marks.

// [slug, name, states, region]
const P = [
  ['acadia', 'Acadia', 'ME', 'East'], ['american-samoa', 'National Park of American Samoa', 'AS', 'Islands'], ['arches', 'Arches', 'UT', 'Southwest'],
  ['badlands', 'Badlands', 'SD', 'Midwest'], ['big-bend', 'Big Bend', 'TX', 'South'], ['biscayne', 'Biscayne', 'FL', 'South'],
  ['black-canyon', 'Black Canyon of the Gunnison', 'CO', 'Rockies'], ['bryce-canyon', 'Bryce Canyon', 'UT', 'Southwest'], ['canyonlands', 'Canyonlands', 'UT', 'Southwest'],
  ['capitol-reef', 'Capitol Reef', 'UT', 'Southwest'], ['carlsbad-caverns', 'Carlsbad Caverns', 'NM', 'Southwest'], ['channel-islands', 'Channel Islands', 'CA', 'California'],
  ['congaree', 'Congaree', 'SC', 'East'], ['crater-lake', 'Crater Lake', 'OR', 'Northwest'], ['cuyahoga-valley', 'Cuyahoga Valley', 'OH', 'Midwest'],
  ['death-valley', 'Death Valley', 'CA, NV', 'California'], ['denali', 'Denali', 'AK', 'Alaska'], ['dry-tortugas', 'Dry Tortugas', 'FL', 'South'],
  ['everglades', 'Everglades', 'FL', 'South'], ['gates-of-the-arctic', 'Gates of the Arctic', 'AK', 'Alaska'], ['gateway-arch', 'Gateway Arch', 'MO', 'Midwest'],
  ['glacier', 'Glacier', 'MT', 'Rockies'], ['glacier-bay', 'Glacier Bay', 'AK', 'Alaska'], ['grand-canyon', 'Grand Canyon', 'AZ', 'Southwest'],
  ['grand-teton', 'Grand Teton', 'WY', 'Rockies'], ['great-basin', 'Great Basin', 'NV', 'Southwest'], ['great-sand-dunes', 'Great Sand Dunes', 'CO', 'Rockies'],
  ['great-smoky-mountains', 'Great Smoky Mountains', 'TN, NC', 'East'], ['guadalupe-mountains', 'Guadalupe Mountains', 'TX', 'South'], ['haleakala', 'Haleakalā', 'HI', 'Islands'],
  ['hawaii-volcanoes', 'Hawaiʻi Volcanoes', 'HI', 'Islands'], ['hot-springs', 'Hot Springs', 'AR', 'South'], ['indiana-dunes', 'Indiana Dunes', 'IN', 'Midwest'],
  ['isle-royale', 'Isle Royale', 'MI', 'Midwest'], ['joshua-tree', 'Joshua Tree', 'CA', 'California'], ['katmai', 'Katmai', 'AK', 'Alaska'],
  ['kenai-fjords', 'Kenai Fjords', 'AK', 'Alaska'], ['kings-canyon', 'Kings Canyon', 'CA', 'California'], ['kobuk-valley', 'Kobuk Valley', 'AK', 'Alaska'],
  ['lake-clark', 'Lake Clark', 'AK', 'Alaska'], ['lassen-volcanic', 'Lassen Volcanic', 'CA', 'California'], ['mammoth-cave', 'Mammoth Cave', 'KY', 'South'],
  ['mesa-verde', 'Mesa Verde', 'CO', 'Rockies'], ['mount-rainier', 'Mount Rainier', 'WA', 'Northwest'], ['new-river-gorge', 'New River Gorge', 'WV', 'East'],
  ['north-cascades', 'North Cascades', 'WA', 'Northwest'], ['olympic', 'Olympic', 'WA', 'Northwest'], ['petrified-forest', 'Petrified Forest', 'AZ', 'Southwest'],
  ['pinnacles', 'Pinnacles', 'CA', 'California'], ['redwood', 'Redwood', 'CA', 'California'], ['rocky-mountain', 'Rocky Mountain', 'CO', 'Rockies'],
  ['saguaro', 'Saguaro', 'AZ', 'Southwest'], ['sequoia', 'Sequoia', 'CA', 'California'], ['shenandoah', 'Shenandoah', 'VA', 'East'],
  ['theodore-roosevelt', 'Theodore Roosevelt', 'ND', 'Midwest'], ['virgin-islands', 'Virgin Islands', 'VI', 'Islands'], ['voyageurs', 'Voyageurs', 'MN', 'Midwest'],
  ['white-sands', 'White Sands', 'NM', 'Southwest'], ['wind-cave', 'Wind Cave', 'SD', 'Midwest'], ['wrangell-st-elias', 'Wrangell–St. Elias', 'AK', 'Alaska'],
  ['yellowstone', 'Yellowstone', 'WY, MT, ID', 'Rockies'], ['yosemite', 'Yosemite', 'CA', 'California'], ['zion', 'Zion', 'UT', 'Southwest'],
]
export const NATIONAL_PARKS = P.map(([slug, name, states, region]) => ({ slug, name, states, region }))
export const parkBySlug = (slug) => NATIONAL_PARKS.find((p) => p.slug === slug) || null
export const REGIONS = ['California', 'Southwest', 'Rockies', 'Northwest', 'Midwest', 'South', 'East', 'Alaska', 'Islands']

/** What a park's name says, for a search box (letters only). */
const plain = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
export const findParks = (q) => { const t = plain(q); return t ? NATIONAL_PARKS.filter((p) => plain(p.name).includes(t) || plain(p.states).includes(t)) : NATIONAL_PARKS }

/**
 * The parks with our marks on them: [{ ...park, visited, want, note }].
 * `marks` are park_marks rows ({ slug, visited_on, want, note }).
 */
export function withMarks(marks = []) {
  const by = new Map((marks || []).map((m) => [m.slug, m]))
  return NATIONAL_PARKS.map((p) => { const m = by.get(p.slug); return { ...p, visited: m && m.visited_on ? m.visited_on : null, want: Boolean(m && m.want), note: m && m.note ? m.note : '' } })
}

/** { been, total, left, percent, next } where `next` is the starred park to see, or the nearest not-yet in California, else the first not-yet. */
export function parkProgress(marks = []) {
  const all = withMarks(marks), been = all.filter((p) => p.visited)
  const left = all.filter((p) => !p.visited)
  const next = left.find((p) => p.want) || left.find((p) => p.region === 'California') || left[0] || null
  return { been: been.length, total: all.length, left: left.length, percent: Math.round((been.length / all.length) * 100), next }
}
