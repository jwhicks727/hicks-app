// The things on a day, as the views list them: family first, then the
// family's events, the Church's celebration, the other observances, the moon.
import { KIND_STYLE, observanceGlyph } from './kinds.js'

const CHURCH_RANKS = ['triduum', 'principal', 'solemnity', 'souls', 'lordFeast', 'feast', 'memorial']
export const shortName = (n) => n.replace(/^The /, '').replace(/ \(.*?\)$/, '').replace(/^Our Lord Jesus Christ, /, 'Christ the ')

/** Is the Church's day worth naming in a month or a year (a celebration, not a plain weekday)? */
export const isCelebration = (lit) => CHURCH_RANKS.includes(lit.rank) && !(lit.rank === 'principal' && !lit.key && /Weekday|Holy Week|Octave/.test(lit.name))

/** [{ key, label, colour, glyph, rainbow, sub }] for a dayView(). */
export function itemsOf(dv, { withChurch = true, withNature = true } = {}) {
  const out = []
  for (const f of dv.family) out.push({ key: 'f' + (f.id || f.title), label: f.title, sub: f.line, colour: KIND_STYLE.family.colour, glyph: f.kind === 'remember' ? 'flame' : 'heart', rainbow: f.kind !== 'remember', kind: 'family' })
  // A school's day off is said once, with every school it's at; one that is also a holiday joins the holiday.
  const offAt = new Map()
  for (const e of dv.events) {
    if (e.school) {
      const k = e.kind + '|' + e.title.toLowerCase()
      if (!offAt.has(k)) offAt.set(k, { e, schools: [] })
      if (!offAt.get(k).schools.includes(e.school.name)) offAt.get(k).schools.push(e.school.name)
      continue
    }
    const s = KIND_STYLE[e.kind] || KIND_STYLE.event
    out.push({ key: 'e' + e.id, label: e.title, colour: s.colour, glyph: s.glyph, rainbow: s.rainbow, kind: e.kind })
  }
  const schoolWords = ({ e, schools }) => `${e.kind === 'no_school' ? 'No school at' : 'At'} ${schools.length > 1 ? schools.slice(0, -1).join(', ') + ' and ' + schools.at(-1) : schools[0]}`
  const joined = new Map()
  for (const g of offAt.values()) {
    const holiday = dv.observances.find((o) => o.name.toLowerCase() === g.e.title.toLowerCase())
    if (holiday) { joined.set(holiday.id, schoolWords(g)); continue }
    const s = KIND_STYLE[g.e.kind]
    out.push({ key: 'e' + g.e.id, label: g.e.title, sub: schoolWords(g), colour: s.colour, glyph: s.glyph, kind: g.e.kind })
  }
  if (withChurch && isCelebration(dv.lit)) out.push({ key: 'lit', label: shortName(dv.lit.name), sub: dv.lit.rankWords, colour: dv.lit.colourHex, glyph: dv.lit.rank === 'memorial' ? 'cross' : 'star', kind: 'church' })
  for (const o of dv.observances) {
    if (!withNature && o.group === 'nature') continue
    out.push({ key: 'o' + o.id, label: o.name, colour: KIND_STYLE[o.group].colour, glyph: observanceGlyph(o), kind: o.group, sub: [o.expected && 'expected', joined.get(o.id)].filter(Boolean).join(' · ') })
  }
  if (withNature && dv.moon && (dv.moon.key === 'full' || dv.moon.key === 'new')) out.push({ key: 'moon', label: dv.moon.key === 'full' ? dv.moon.moonName : 'New moon', colour: KIND_STYLE.moon.colour, glyph: 'moon', moon: dv.moon.key, kind: 'moon' })
  return out
}
