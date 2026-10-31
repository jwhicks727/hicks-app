// What each kind of calendar item looks like: its colour and its picture.
// Group colours are the observance groups' (observances.js GROUPS); event
// kinds are calendar_events.kind.
export const KIND_STYLE = {
  church: { colour: '#3E7A4C', glyph: 'cross' },
  family: { colour: '#E0662F', glyph: 'heart', rainbow: true },
  holidays: { colour: '#E0662F', glyph: 'flag' },
  civil: { colour: '#4A7FD6', glyph: 'bridge' },
  heritage: { colour: '#8A5BC4', glyph: 'globe' },
  faiths: { colour: '#C9961A', glyph: 'flame' },
  nature: { colour: '#3BA3A8', glyph: 'leaf' },
  birding: { colour: '#5F8A4A', glyph: 'bird' },
  fun: { colour: '#E85D9A', glyph: 'note' },
  wild: { colour: '#5F8A4A', glyph: 'leaf' },
  mindful: { colour: '#B5658F', glyph: 'lotus' },
  moon: { colour: '#6F7FB8', glyph: 'moon' },
  event: { colour: '#6E5B4B', glyph: 'dot' },
  school: { colour: '#D9A520', glyph: 'school' },
  no_school: { colour: '#F08A3C', glyph: 'sun' },
  ministry: { colour: '#3E7A4C', glyph: 'cross' },
  show: { colour: '#8A5BC4', glyph: 'note', rainbow: true },
  holiday: { colour: '#E0662F', glyph: 'flag' },
  other: { colour: '#6E5B4B', glyph: 'dot' },
}

/** Which picture an observance gets: a few have their own. */
export function observanceGlyph(o) {
  if (o.meteors) return 'meteor'
  if (o.eclipse) return o.eclipse.kind === 'lunar' ? 'moon' : 'sun'
  if (o.clocks) return 'clock'
  if (o.season) return o.season === 'winter' || o.season === 'autumn' ? 'leaf' : 'sun'
  return KIND_STYLE[o.group].glyph
}
