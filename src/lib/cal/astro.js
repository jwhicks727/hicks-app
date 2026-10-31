// ============================================
// astro.js -- the sky's events on a day, with what they are and where to read
// more: full and new moons, supermoons, eclipses, meteor showers, solstices
// and equinoxes. Worked out in nature.js; this adds the words and links.
// ============================================

import { moonPhases, eclipsesOf, seasonsOf, METEOR_SHOWERS } from './nature.js'
import { parts, MONTHS } from './dates.js'

const MOON_LORE = {
  'Wolf Moon': 'Named for wolves heard in the deep of winter.', 'Snow Moon': 'Named for the heaviest snows of the year.',
  'Worm Moon': 'Named for earthworms coming up as the ground thaws.', 'Pink Moon': 'Named for the pink wild phlox that blooms in April.',
  'Flower Moon': 'Named for the flowers everywhere in May.', 'Strawberry Moon': 'Named for the wild strawberry harvest.',
  'Buck Moon': 'Named for the new antlers on deer.', 'Sturgeon Moon': 'Named for the sturgeon caught in the Great Lakes.',
  'Corn Moon': 'Named for the corn harvest.', 'Harvest Moon': 'The full moon nearest the September equinox: it rises near sunset several nights running, light to bring the harvest in.',
  'Hunter’s Moon': 'The full moon after the Harvest Moon, light to hunt by.', 'Beaver Moon': 'Named for beavers readying their lodges for winter.',
  'Cold Moon': 'Named for the long, cold nights of December.', 'Blue Moon': 'A second full moon in one calendar month: once in a blue moon.',
}
const LINKS = {
  moon: [['The moon’s phases, for kids', 'https://spaceplace.nasa.gov/moon-phases/'], ['NASA: the moon', 'https://science.nasa.gov/moon/'], ['This year’s moons', 'https://www.timeanddate.com/moon/phases/']],
  eclipse: [['How eclipses work, for kids', 'https://spaceplace.nasa.gov/eclipses/'], ['NASA: eclipses', 'https://science.nasa.gov/eclipses/']],
  meteors: [['Meteor showers, for kids', 'https://spaceplace.nasa.gov/meteor-shower/'], ['The American Meteor Society’s calendar', 'https://www.amsmeteors.org/meteor-showers/meteor-shower-calendar/'], ['Meteor showers this year', 'https://www.timeanddate.com/astronomy/meteor-shower/']],
  season: [['Why we have seasons, for kids', 'https://spaceplace.nasa.gov/seasons/'], ['Solstices and equinoxes', 'https://www.timeanddate.com/calendar/seasons.html']],
}
const eclipsePage = (e) => { const [y, m, d] = parts(e.date); return `https://www.timeanddate.com/eclipse/${e.kind}/${y}-${MONTHS[m - 1].toLowerCase()}-${d}` }

/**
 * The sky's events on a date: [{ kind, title, lines: [], times: [[label, Date]], links: [[label, url]], ... }]
 * kind: full, new, eclipse-lunar, eclipse-solar, meteors, season.
 */
export function astronomyOn(d) {
  const y = parts(d)[0], out = []
  for (const e of eclipsesOf(y).filter((x) => x.date === d)) {
    if (e.kind === 'lunar') {
      const what = { total: 'A total eclipse of the moon', partial: 'A partial eclipse of the moon', penumbral: 'A faint eclipse of the moon' }[e.type]
      const lines = [
        e.type === 'total' ? 'The Earth’s shadow covers the whole moon and it turns copper red, lit only by every sunrise and sunset on Earth at once.'
          : e.type === 'partial' ? `The Earth’s dark shadow takes a bite out of the moon: ${Math.round(e.magnitude * 100)}% of it at the most.`
            : 'The moon passes through the Earth’s faint outer shadow: a subtle dimming, hard to notice.',
        e.visible ? (e.wholeVisible ? 'The moon is up for all of it at home. No glasses needed: just look.' : 'The moon is up for part of it at home.') : 'The moon is below the horizon here while it happens.',
      ]
      const times = []
      if (e.phases.partial) times.push(['The shadow’s bite begins', e.phases.partial[0]])
      if (e.phases.total) times.push(['Totality begins', e.phases.total[0]], ['Totality ends', e.phases.total[1]])
      if (!e.phases.partial) times.push(['Greatest', e.at])
      else if (!e.phases.total) times.push(['Greatest', e.at])
      if (e.phases.partial) times.push(['The bite is gone', e.phases.partial[1]])
      out.push({ kind: 'eclipse-lunar', type: e.type, title: what, lines, times, visible: e.visible, links: [['This eclipse, with a map', eclipsePage(e)], ...LINKS.eclipse] })
    } else {
      const what = { total: 'A total eclipse of the sun', annular: 'A ring of fire: an annular eclipse of the sun', hybrid: 'A hybrid eclipse of the sun', partial: 'A partial eclipse of the sun' }[e.type]
      out.push({ kind: 'eclipse-solar', type: e.type, title: what, lines: ['The moon passes in front of the sun, seen along a path elsewhere on Earth: the map shows where.', 'Never look at the sun without eclipse glasses.'], times: [['Greatest', e.at]], links: [['This eclipse, with a map', eclipsePage(e)], ...LINKS.eclipse] })
    }
  }
  for (const p of moonPhases(y).filter((x) => x.date === d && (x.key === 'full' || x.key === 'new'))) {
    if (p.key === 'full') {
      const lines = [MOON_LORE[p.moonName] || '']
      if (p.biggest) lines.push(`The biggest full moon of the year, ${p.km.toLocaleString('en-US')} km away: about 14% bigger and 30% brighter than the year’s smallest.`)
      else if (p.supermoon) lines.push(`A supermoon, ${p.km.toLocaleString('en-US')} km away and near its closest.`)
      out.push({ kind: 'full', title: `The ${p.moonName}${p.supermoon ? ', a supermoon' : ''}`, lines: lines.filter(Boolean), times: [['Full', p.at]], supermoon: p.supermoon, links: LINKS.moon })
    } else {
      out.push({ kind: 'new', title: 'New moon', lines: ['No moon tonight: the darkest skies of the month, best for stars and, away from town, the Milky Way.'], times: [['New', p.at]], links: LINKS.moon })
    }
  }
  const [, m, dd] = parts(d)
  for (const s of METEOR_SHOWERS.filter((x) => x.m === m && x.d === dd)) out.push({ kind: 'meteors', title: s.name, lines: [`${s.word}. They peak around tonight.`], times: [], links: LINKS.meteors })
  for (const s of seasonsOf(y).filter((x) => x.date === d)) {
    const lines = { spring: ['Day and night are about even, and the sun rises due east and sets due west.'], summer: ['The longest day of the year: the sun rises farthest north and climbs highest at noon.'], autumn: ['Day and night are about even, and the sun rises due east and sets due west.'], winter: ['The shortest day of the year, and from tomorrow the light starts coming back.'] }[s.key]
    out.push({ kind: 'season', season: s.key, title: s.name, lines, times: [['The moment', s.at]], links: LINKS.season })
  }
  return out
}
