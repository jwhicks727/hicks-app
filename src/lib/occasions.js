// ============================================
// occasions.js -- which days get the swirling light, and in what colours
// ============================================
// The light is occasional and its colours mean something (CLAUDE.md, "The
// look"): the rainbow for the family's own days, a liquid light show for a
// concert, red and green with fluttering white at Christmas, the Church's
// colours on its great feasts. Pure: tests/occasions.test.mjs.

const P = {
  rainbow: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#AF52DE', '#FF2D55'],
  psychedelic: ['#FF00CC', '#FF3B30', '#FFCC00', '#B6FF00', '#00E5FF', '#7A5CFF', '#FF2D55', '#00FFA3'],
  christmas: ['#D7263D', '#1B9E4B', '#F4F1E8', '#B3001B', '#0B6E3A', '#F4F1E8'],
  easter: ['#FFD86B', '#FFF6D5', '#F7B32B', '#FFFFFF', '#E8C547', '#FFF1B8'],
  fire: ['#FF4E1A', '#FF9F1C', '#D7263D', '#FFD166', '#FF6B35'],
  white: ['#F6E3A1', '#FFFFFF', '#D9B95A', '#FFF4C7', '#E9D28A'],
  red: ['#B8322A', '#E85D3A', '#F2C14E', '#7A1C17', '#E85D3A'],
  advent: ['#6B4A8E', '#8E6CC0', '#3E2A5C', '#A98BD6'],
  gaudete: ['#D98AA6', '#6B4A8E', '#F2B8CB', '#8E6CC0'],
  sacredHeart: ['#B8322A', '#F2C14E', '#FFFFFF', '#E85D3A', '#D7263D'],
  guadalupe: ['#1F8A8C', '#2BA88A', '#F2C14E', '#D7263D', '#F7E7B4'],
  halloween: ['#FF7A00', '#8A2BE2', '#3DDC84', '#FF9F1C'],
  july4: ['#B22234', '#FFFFFF', '#3C3B6E', '#4A7FD6'],
  redGold: ['#D7263D', '#F2C14E', '#B3001B', '#FFD166'],
  hanukkah: ['#2D6CDF', '#FFFFFF', '#A9C9FF', '#F2C14E'],
  harvest: ['#C2551F', '#E0A030', '#8C3B1A', '#F2C14E'],
  newYear: ['#F2C14E', '#E5E4E2', '#FFFFFF', '#B8860B'],
  valentine: ['#FF4D6D', '#FF8FA3', '#C9184A', '#FFCCD5'],
  shamrock: ['#169B62', '#7BC67B', '#F2C14E', '#0B6E3A'],
  summer: ['#FFD166', '#FF9F1C', '#FFF1B8', '#F7B32B'],
  winter: ['#A9D6E5', '#FFFFFF', '#61A5C2', '#F6E7B8'],
  bloodMoon: ['#8B2E16', '#C4501F', '#E07A3F', '#3A0F08'],
}

/**
 * The occasion of a day, or null: { key, name, colours, mode, extra }.
 * mode: 'swirl' (colours chasing round the edge) or 'liquid' (a light show).
 * extra: 'flutter' (falling white), 'sparkle', 'rise' (sparks going up), or null.
 * `day` is a dayView(); `events` are that day's events; `eclipse` an eclipse on it.
 */
export function occasionFor(day, { events = day.events || [], eclipse = day.eclipse || null } = {}) {
  const { lit } = day
  const md = day.date.slice(5)
  const make = (key, name, palette, mode = 'swirl', extra = null) => ({ key, name, colours: P[palette], mode, extra })
  const fam = day.family.find((f) => f.kind !== 'remember')
  if (fam) return make('family', fam.title, 'rainbow', 'swirl', 'sparkle')
  const show = events.find((e) => e.kind === 'show')
  if (show) return make('show', show.title, 'psychedelic', 'liquid')
  if (md === '12-25' || md === '12-24') return make('christmas', md === '12-24' ? 'Christmas Eve' : 'Christmas', 'christmas', 'swirl', 'flutter')
  if (lit.key === 'easter') return make('easter', 'Easter', 'easter', 'swirl', 'sparkle')
  if (lit.key === 'pentecost') return make('pentecost', 'Pentecost', 'fire', 'swirl', 'rise')
  if (lit.key === 'sacredHeart') return make('sacredHeart', 'The Sacred Heart, our parish’s feast', 'sacredHeart', 'swirl', 'rise')
  if (md === '12-12') return make('guadalupe', 'Our Lady of Guadalupe', 'guadalupe', 'swirl', 'sparkle')
  if (eclipse && eclipse.type === 'total' && eclipse.visible) return make('eclipse', 'A total eclipse of the moon tonight', 'bloodMoon')
  if (lit.season === 'advent' && lit.rank === 'sunday') return make('advent', lit.name, lit.colour === 'rose' ? 'gaudete' : 'advent')
  if (['principal', 'solemnity'].includes(lit.rank) && lit.key !== 'ashWednesday' && !/Holy Week|Palm Sunday/.test(lit.name)) {
    return make('feast', lit.name, lit.colour === 'red' ? 'red' : 'white', 'swirl', lit.colour === 'red' ? 'rise' : 'sparkle')
  }
  const obs = new Set(day.observances.map((o) => o.id))
  if (md === '01-01' || md === '12-31') return make('newYear', md === '01-01' ? 'New Year’s Day' : 'New Year’s Eve', 'newYear', 'swirl', 'sparkle')
  if (obs.has('halloween')) return make('halloween', 'Halloween', 'halloween')
  if (obs.has('independence')) return make('july4', 'Independence Day', 'july4', 'swirl', 'sparkle')
  if (obs.has('thanksgiving')) return make('thanksgiving', 'Thanksgiving', 'harvest')
  if (obs.has('lunar-new-year')) return make('lunarNewYear', 'Lunar New Year', 'redGold', 'swirl', 'sparkle')
  if (obs.has('hanukkah')) return make('hanukkah', 'Hanukkah', 'hanukkah', 'swirl', 'sparkle')
  if (obs.has('valentine')) return make('valentine', 'Valentine’s Day', 'valentine')
  if (md === '03-17') return make('stPatrick', 'St Patrick’s Day', 'shamrock')
  if (obs.has('jerry') || obs.has('cornell')) return make('dead', obs.has('jerry') ? 'Jerry’s birthday' : 'Cornell ’77', 'psychedelic', 'liquid')
  if (obs.has('summer')) return make('summer', 'The longest day', 'summer')
  if (obs.has('winter')) return make('winter', 'The light starts coming back', 'winter', 'swirl', 'flutter')
  return null
}

export const PALETTES = P
