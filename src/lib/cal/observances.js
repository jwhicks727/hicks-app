// ============================================
// observances.js -- the days the calendar celebrates besides the Church's:
// holidays big and small, civil rights and heritage, other faiths' holy days,
// the seasons and the sky, Laurie's birding days, and a few small joys.
// ============================================
// Each kind has a switch in Settings (GROUPS). Each day says in a line why it
// matters. Dates are worked out, never typed in per year, except Lunar New
// Year (a table to extend) and the Islamic days (expected, and labelled so).

import { ds, addDays, nthWeekday, parts, MONTHS } from './dates.js'
import { jewishHolyDays } from './hebrew.js'
import { islamicDays } from './islamic.js'
import { seasonsOf, METEOR_SHOWERS, clockChanges, eclipsesOf, moonPhases } from './nature.js'

export const GROUPS = {
  holidays: { name: 'Holidays', word: 'National and California holidays, and the family ones like Mother’s Day' },
  civil: { name: 'Civil rights', word: 'The people and days that widened who America is for' },
  heritage: { name: 'Heritage months', word: 'A month for each of the peoples who make up our country' },
  faiths: { name: 'Our neighbours’ holy days', word: 'Jewish, Muslim and Lunar New Year days' },
  nature: { name: 'Seasons and sky', word: 'Solstices, equinoxes, meteor showers and the clocks changing' },
  birding: { name: 'Birding', word: 'Big Days, the backyard count and the Christmas count' },
  wild: { name: 'Wild seasons', word: 'Big Bear’s eagles, monarchs, whales, wildflowers, migration nights' },
  mindful: { name: 'Mindful days', word: 'Thich Nhat Hanh’s Continuation Day, Vesak, Bodhi Day, Nirvana Day' },
  fun: { name: 'Small joys', word: 'Pi Day, Groundhog Day, Jerry’s birthday and the like' },
}

const fixed = (m, d) => (y) => ds(y, m, d)
const nth = (m, wd, n) => (y) => nthWeekday(y, m, wd, n)
const span = (from, to) => (y) => [from(y), to(y)]
const month = (m) => span(fixed(m, 1), (y) => ds(y, m + 1, 0))

/** [id, group, name, when(y) -> date | [start, end], word] */
const LIST = [
  // Holidays
  ['new-year', 'holidays', 'New Year’s Day', fixed(1, 1), 'A fresh calendar on the wall'],
  ['mlk', 'civil', 'Martin Luther King Jr. Day', nth(1, 1, 3), 'A day on, not a day off: the national day of service'],
  ['valentine', 'holidays', 'Valentine’s Day', fixed(2, 14), 'For the people we love, after a priest and martyr of Rome'],
  ['presidents', 'holidays', 'Presidents’ Day', nth(2, 1, 3), 'Washington’s Birthday, as the law still calls it'],
  ['mothers', 'holidays', 'Mother’s Day', nth(5, 0, 2), 'Breakfast in bed, or at least coffee'],
  ['memorial', 'holidays', 'Memorial Day', nth(5, 1, -1), 'For those who died serving the country'],
  ['juneteenth', 'civil', 'Juneteenth', fixed(6, 19), 'June 19, 1865: freedom reaches the last enslaved people, in Galveston'],
  ['fathers', 'holidays', 'Father’s Day', nth(6, 0, 3), 'The grill is someone else’s today'],
  ['independence', 'holidays', 'Independence Day', fixed(7, 4), 'Fireworks over the Inland Empire'],
  ['labor', 'holidays', 'Labor Day', nth(9, 1, 1), 'For the people whose work built everything'],
  ['grandparents', 'holidays', 'Grandparents Day', (y) => addDays(nthWeekday(y, 9, 1, 1), 6), 'A call, a card or a visit'],
  ['indigenous', 'civil', 'Indigenous Peoples’ Day', nth(10, 1, 2), 'The peoples who were here first, on the day also kept as Columbus Day'],
  ['halloween', 'holidays', 'Halloween', fixed(10, 31), 'All Hallows’ Eve, the night before All Saints'],
  ['election', 'holidays', 'Election Day', (y) => (y % 2 === 0 ? addDays(nthWeekday(y, 11, 1, 1), 1) : null), 'Vote, and take Anna along'],
  ['veterans', 'holidays', 'Veterans Day', fixed(11, 11), 'Thanks to all who served, on St Martin the soldier’s day'],
  ['thanksgiving', 'holidays', 'Thanksgiving', nth(11, 4, 4), 'Jason’s kitchen at full tilt'],
  ['christmas-eve', 'holidays', 'Christmas Eve', fixed(12, 24), 'The vigil of the Nativity'],
  ['new-years-eve', 'holidays', 'New Year’s Eve', fixed(12, 31), 'Staying up for midnight, or trying to'],
  // Civil rights
  ['korematsu', 'civil', 'Fred Korematsu Day', fixed(1, 30), 'California remembers the man who stood against Japanese American incarceration'],
  ['rosa-parks', 'civil', 'Rosa Parks Day', fixed(2, 4), 'California keeps her birthday: the seat she would not give up'],
  ['chavez', 'civil', 'César Chávez Day', fixed(3, 31), 'A California holiday for the farmworkers’ champion: ¡Sí, se puede!'],
  ['brown', 'civil', 'Brown v. Board of Education', fixed(5, 17), '1954: the Supreme Court ends segregated schools'],
  ['loving', 'civil', 'Loving Day', fixed(6, 12), '1967: Richard and Mildred Loving win the right to marry'],
  ['ada', 'civil', 'The ADA’s anniversary', fixed(7, 26), '1990: the Americans with Disabilities Act becomes law'],
  ['womens-equality', 'civil', 'Women’s Equality Day', fixed(8, 26), '1920: the Nineteenth Amendment gives women the vote'],
  ['native-american-day', 'civil', 'Native American Day', nth(9, 5, 4), 'California’s own day for its first peoples'],
  ['human-rights', 'civil', 'Human Rights Day', fixed(12, 10), '1948: the Universal Declaration of Human Rights'],
  // Heritage months
  ['black-history', 'heritage', 'Black History Month', month(2), 'Stories worth telling all year, told loudest in February'],
  ['womens-history', 'heritage', 'Women’s History Month', month(3), 'The women who shaped the country, and the ones who shaped us'],
  ['irish-american', 'heritage', 'Irish-American Heritage Month', month(3), 'With St Patrick in the middle of it'],
  ['arab-american', 'heritage', 'Arab American Heritage Month', month(4), 'Food, poetry and faith from the Arab world'],
  ['aanhpi', 'heritage', 'Asian American and Pacific Islander Heritage Month', month(5), 'From the railroads to Hawai‘i to the strip malls of the 909'],
  ['jewish-american', 'heritage', 'Jewish American Heritage Month', month(5), 'Three and a half centuries of Jewish life in America'],
  ['pride', 'heritage', 'Pride Month', month(6), 'Remembering the Stonewall uprising of June 1969'],
  ['disability-pride', 'heritage', 'Disability Pride Month', month(7), 'Kept in the month the ADA was signed'],
  ['hispanic-heritage', 'heritage', 'Hispanic Heritage Month', span(fixed(9, 15), fixed(10, 15)), 'Starting on the independence days of five Central American countries'],
  ['filipino-american', 'heritage', 'Filipino American History Month', month(10), 'October 1587: Filipinos first land in California, at Morro Bay'],
  ['italian-american', 'heritage', 'Italian American Heritage Month', month(10), 'Sunday gravy and the saints of the old country'],
  ['native-american-heritage', 'heritage', 'Native American Heritage Month', month(11), 'The first peoples of this land, in the month of thanks'],
  ['dia-de-muertos', 'heritage', 'Día de los Muertos', span(fixed(11, 1), fixed(11, 2)), 'Ofrendas, marigolds and pan de muerto, alongside All Saints and All Souls'],
  ['kwanzaa', 'heritage', 'Kwanzaa', span(fixed(12, 26), (y) => ds(y + 1, 1, 1)), 'Seven days, seven principles, starting with unity'],
  // Our neighbours' holy days
  ['passover', 'faiths', 'Passover', (y) => { const d = jewishHolyDays(y).passover; return [d, addDays(d, 7)] }, 'The first Seder is the evening before: the night that is different from all other nights'],
  ['rosh-hashanah', 'faiths', 'Rosh Hashanah', (y) => { const d = jewishHolyDays(y).roshHashanah; return [d, addDays(d, 1)] }, 'The Jewish New Year, from sundown the evening before: apples and honey'],
  ['yom-kippur', 'faiths', 'Yom Kippur', (y) => jewishHolyDays(y).yomKippur, 'The Day of Atonement, from sundown the evening before'],
  ['hanukkah', 'faiths', 'Hanukkah', (y) => { const d = jewishHolyDays(y).hanukkah; return [d, addDays(d, 7)] }, 'The first candle is lit the evening before: eight nights of light'],
  ['lunar-new-year', 'faiths', 'Lunar New Year', (y) => LUNAR_NEW_YEAR[y] || null, (y) => `The Year of the ${ZODIAC[(y - 4) % 12]} begins`],
  // Seasons and sky are added below from nature.js.
  // Birding
  ['gbbc', 'birding', 'Great Backyard Bird Count', (y) => { const end = nthWeekday(y, 2, 1, 3); return [addDays(end, -3), end] }, 'Four days: count the birds you see for fifteen minutes or more, and tell eBird'],
  ['swallows', 'birding', 'The swallows return to Capistrano', fixed(3, 19), 'By tradition, on St Joseph’s Day, at the old mission'],
  ['global-big-day', 'birding', 'Global Big Day', nth(5, 6, 2), 'The world goes birding on one day, and so do we'],
  ['october-big-day', 'birding', 'October Big Day', nth(10, 6, 2), 'The autumn Big Day, with the migrants passing through'],
  ['cbc', 'birding', 'Christmas Bird Count', span(fixed(12, 14), (y) => ds(y + 1, 1, 5)), 'The oldest bird count of all, since 1900: each circle picks one day'],
  ['bird-day', 'birding', 'National Bird Day', fixed(1, 5), 'A day for the birds, literally'],
  // Wild seasons: when these usually happen near us, with who watches them [.., links]
  ['eagles', 'wild', 'Big Bear’s eagles are nesting', span(fixed(1, 1), fixed(6, 15)), 'Jackie and Shadow, the bald eagles above Big Bear Lake, usually lay their eggs in January and raise chicks into spring: the nest cam shows it all', [['The eagle cam', 'https://www.friendsofbigbearvalley.org/']]],
  ['monarchs', 'wild', 'Monarchs winter on the coast', span(fixed(11, 1), (y) => ds(y + 1, 2, 28)), 'Western monarch butterflies cluster in coastal eucalyptus and pines; volunteers count them around Thanksgiving and New Year', [['The western monarch counts', 'https://www.westernmonarchcount.org/']]],
  ['whales', 'wild', 'Gray whales pass the coast', span(fixed(12, 1), (y) => ds(y + 1, 5, 15)), 'Down to Baja in winter and back north in spring, mothers and calves last; watch from Point Vicente or a whale-watching boat', [['The gray whale census', 'https://www.acs-la.org/']]],
  ['wildflowers', 'wild', 'Wildflower season', span(fixed(2, 15), fixed(4, 30)), 'The deserts bloom first, then the poppies; after a wet winter, a superbloom', [['Wildflower reports', 'https://www.desertusa.com/wildflo/wildupdates.html'], ['Theodore Payne’s wildflower hotline', 'https://theodorepayne.org/']]],
  ['poppy-day', 'wild', 'California Poppy Day', fixed(4, 6), 'The state flower’s own day'],
  ['elephant-seals', 'wild', 'Elephant seal pups', span(fixed(12, 20), (y) => ds(y + 1, 3, 15)), 'Pups are born on the beach at Piedras Blancas, near San Simeon, from late December', [['Friends of the Elephant Seal', 'https://www.elephantseal.org/']]],
  ['grunion', 'wild', 'Grunion runs', span(fixed(3, 1), fixed(8, 31)), 'Small silver fish come ashore to spawn on the nights after full and new moons; the state posts the expected runs', [['Expected grunion runs', 'https://wildlife.ca.gov/Conservation/Marine/Grunion']]],
  ['migration-spring', 'wild', 'Spring migration nights', span(fixed(3, 15), fixed(5, 31)), 'Millions of birds fly over at night; BirdCast forecasts the big nights, and mornings after are best for Laurie', [['Tonight’s migration forecast', 'https://birdcast.info/']]],
  ['migration-fall', 'wild', 'Fall migration nights', span(fixed(8, 15), fixed(11, 15)), 'The birds head south over us at night; BirdCast forecasts the big nights', [['Tonight’s migration forecast', 'https://birdcast.info/']]],
  ['fall-colour', 'wild', 'Fall colour in the Eastern Sierra', span(fixed(9, 20), fixed(10, 31)), 'The aspens turn gold up the 395, high groves first', [['Where the colour is', 'https://californiafallcolor.com/']]],
  ['hummingbirds', 'wild', 'Anna’s hummingbirds are nesting', span(fixed(12, 1), (y) => ds(y + 1, 3, 31)), 'Named for a duchess, not our Anna: they nest in winter here, nests the size of a walnut', [['Anna’s hummingbird', 'https://www.allaboutbirds.org/guide/Annas_Hummingbird']]],
  // Mindful days (Plum Village and the wider Buddhist year)
  ['thay-continuation', 'mindful', 'Thich Nhat Hanh’s Continuation Day', fixed(10, 11), 'Thay was born on October 11, 1926; Plum Village calls a birthday a Continuation Day, because a cloud never dies, it becomes rain'],
  ['thay-remembered', 'mindful', 'Thich Nhat Hanh remembered', fixed(1, 22), 'Thay passed into his next form on January 22, 2022, at his root temple in Huế'],
  ['vesak', 'mindful', 'Vesak', (y) => moonPhases(y).find((p) => p.key === 'full' && p.date.slice(5, 7) === '05')?.date || null, 'The Buddha’s birth, awakening and passing, kept on the full moon of May'],
  ['bodhi-day', 'mindful', 'Bodhi Day', fixed(12, 8), 'The Buddha’s awakening under the bodhi tree, as Zen keeps it'],
  ['nirvana-day', 'mindful', 'Nirvana Day', fixed(2, 15), 'The Buddha’s passing, a day to remember impermanence'],
  // Small joys
  ['groundhog', 'fun', 'Groundhog Day', fixed(2, 2), 'Six more weeks of winter, or not'],
  ['pi', 'fun', 'Pi Day', fixed(3, 14), '3.14: pie for dinner is mathematically justified'],
  ['earth', 'fun', 'Earth Day', fixed(4, 22), 'Plant something'],
  ['arbor', 'fun', 'Arbor Day', nth(4, 5, -1), 'Plant a tree, or hug one'],
  ['world-art', 'fun', 'World Art Day', fixed(4, 15), 'Leonardo’s birthday: a good day for Laurie to paint'],
  ['teacher-week', 'fun', 'Teacher Appreciation Week', (y) => { const mon = addDays(nthWeekday(y, 5, 0, 1), 1); return [mon, addDays(mon, 4)] }, 'The first full week of May: for Laurie, and every teacher Anna has'],
  ['cornell', 'fun', 'Cornell ’77', fixed(5, 8), 'May 8, 1977: the Grateful Dead at Barton Hall'],
  ['jerry', 'fun', 'Jerry Garcia’s birthday', fixed(8, 1), 'Born August 1, 1942'],
  ['world-teachers', 'fun', 'World Teachers’ Day', fixed(10, 5), 'The world says thank you to teachers'],
]

// Lunar New Year (Chinese calendar). Extend before 2036.
const LUNAR_NEW_YEAR = { 2025: '2025-01-29', 2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13', 2030: '2030-02-03', 2031: '2031-01-23', 2032: '2032-02-11', 2033: '2033-01-31', 2034: '2034-02-19', 2035: '2035-02-08' }
const ZODIAC = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig']
const ISLAMIC = {
  ramadan: ['Ramadan begins', 'A month of fasting from dawn to sunset, expected to begin around now: the new moon decides'],
  eidAlFitr: ['Eid al-Fitr', 'The feast at the end of Ramadan, expected around now: the new moon decides'],
  eidAlAdha: ['Eid al-Adha', 'The Feast of the Sacrifice, remembering Abraham, expected around now'],
}

const cache = new Map()

/** Everything of year `y`: [{ id, group, name, start, end, word, expected? }], by date. */
export function observancesFor(y) {
  if (cache.has(y)) return cache.get(y)
  const out = []
  for (const [id, group, name, when, word, links] of LIST) {
    const w = when(y)
    if (!w) continue
    const [start, end] = Array.isArray(w) ? w : [w, w]
    out.push({ id, group, name, start, end, word: typeof word === 'function' ? word(y) : word, links: links || null })
  }
  for (const { key, date } of islamicDays(y)) out.push({ id: `${key}-${date}`, group: 'faiths', name: ISLAMIC[key][0], start: date, end: date, word: ISLAMIC[key][1], expected: true })
  for (const s of seasonsOf(y)) out.push({ id: s.key, group: 'nature', name: s.name, start: s.date, end: s.date, word: s.word, at: s.at, season: s.key })
  for (const c of clockChanges(y)) out.push({ id: c.name, group: 'nature', name: c.name, start: c.date, end: c.date, word: c.word, clocks: true })
  for (const e of eclipsesOf(y)) {
    const name = e.kind === 'lunar' ? `${e.type === 'total' ? 'Total' : e.type === 'partial' ? 'Partial' : 'Faint'} eclipse of the moon` : `${e.type === 'annular' ? 'Ring of fire' : e.type === 'total' ? 'Total eclipse of the sun' : `${e.type[0].toUpperCase()}${e.type.slice(1)} eclipse of the sun`}`
    const word = e.kind === 'lunar' ? (e.visible ? 'Seen from home: look up, no glasses needed' : 'Not seen from here: the moon is down') : 'Seen far from here; never look at the sun without eclipse glasses'
    out.push({ id: `eclipse-${e.date}-${e.kind}`, group: 'nature', name, start: e.date, end: e.date, word, eclipse: e })
  }
  for (const m of METEOR_SHOWERS) out.push({ id: m.name, group: 'nature', name: m.name, start: ds(y, m.m, m.d), end: ds(y, m.m, m.d), word: `${m.word}. Peaks around tonight.`, meteors: true })
  out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  cache.set(y, out)
  return out
}

/**
 * The observances on a date, given which groups are on. A span that began
 * earlier (a heritage month, Hanukkah's later nights) comes back with
 * `ongoing: true` and its day count, so a screen can keep it quiet.
 */
export function observancesOn(d, groups = null) {
  const y = parts(d)[0]
  const list = [...observancesFor(y - 1).filter((o) => o.end >= `${y}-01-01`), ...observancesFor(y)]
  return list
    .filter((o) => o.start <= d && o.end >= d && (!groups || groups[o.group] !== false))
    .map((o) => (o.start === d ? o : { ...o, ongoing: true, dayOf: Math.round((Date.UTC(...dParts(d)) - Date.UTC(...dParts(o.start))) / 864e5) + 1 }))
}
const dParts = (s) => { const [y, m, d] = parts(s); return [y, m - 1, d] }

/** "through October 15" for a span. */
export function spanWords(o) {
  if (o.start === o.end) return ''
  const [, m, d] = parts(o.end)
  return `through ${MONTHS[m - 1]} ${d}`
}
