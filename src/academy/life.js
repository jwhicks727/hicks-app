// ============================================
// life.js -- what stirs in the academy: animals that wander, things that glow, steam, bubbles and notes
// ============================================
// Pure, so tests run it in Node (tests/atmosphere.test.mjs). A thing in a room is alive by what it is: an animal
// strolls to the next free square and back toward where Anna put it, a bird or a butterfly hovers, a lamp or a
// candle gives light once it's dark, a cup steams, a flask bubbles, an instrument lets a note go. Nothing here
// changes where anything is kept: a wander is only ever on screen, and arranging puts everything back on its
// own square. The pictures the family adds (the `academy` bucket) join in by the category they were filed under:
// anything under Animals wanders.

import { ITEM } from './items.js'

// Animals that fly or float hover where they are; the ones that swim only move on water; the rest walk
const HOVER = new Set(['butterfly', 'bird', 'parrot', 'dove', 'owl', 'bat', 'lady-beetle', 'ghost', 'kite'])
const SWIM = new Set(['fish', 'tropical-fish', 'whale', 'dolphin', 'octopus', 'jellyfish', 'duck', 'swan'])
const STILL = new Set(['carousel-horse', 'teddy-bear', 'nesting-dolls'])

/**
 * How a thing in a room moves by itself: 'walk', 'hover', 'swim' (on a water floor) or null (it stays put).
 * `asset` is the family's own picture when the thing is one ({ cat }).
 */
export function gait(key, asset = null, floor = 'wood') {
  if (asset) return asset.cat === 'Animals' ? 'walk' : null
  if (STILL.has(key)) return null
  if (HOVER.has(key)) return 'hover'
  if (SWIM.has(key)) return floor === 'water' ? 'swim' : key === 'duck' || key === 'swan' ? 'walk' : null
  const it = ITEM[key]
  return it && it.cat === 'Animals' ? 'walk' : null
}

/** How far a wanderer strays from the square it was put on. */
export const REACH = 2

/**
 * A wanderer's next square: one step along the grid onto a free square of the n×n floor, no farther than `reach`
 * from `home`, or null when there's nowhere to go. `blocked` is a Set of 'i,j' squares that are taken.
 */
export function stepFrom(pos, home, blocked, n, r = Math.random, reach = REACH) {
  const open = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([di, dj]) => ({ i: pos.i + di, j: pos.j + dj }))
    .filter((p) => p.i >= 0 && p.j >= 0 && p.i < n && p.j < n && !blocked.has(`${p.i},${p.j}`) && Math.abs(p.i - home.i) <= reach && Math.abs(p.j - home.j) <= reach)
  return open.length ? open[Math.floor(r() * open.length) % open.length] : null
}

// What gives light once it's dark: [its colour, how far it reaches (in squares), whether it flickers]
const WARM = '#FFD79A'
export const GLOWS = {
  'couch-and-lamp': [WARM, 1.9], 'light-bulb': ['#FFE08A', 1.6], 'diya-lamp': ['#FFB05A', 1.3, true], candle: ['#FFB05A', 1.2, true], flashlight: ['#FFF0B8', 1.3],
  television: ['#9FD0FF', 1.5, true], 'desktop-computer': ['#A8D8FF', 1.2], laptop: ['#A8D8FF', 1], 'crystal-ball': ['#C9A8FF', 1.2], 'glowing-star': ['#FFE27A', 1.3],
  'jack-o-lantern': ['#FF9A3D', 1.2, true], 'christmas-tree': ['#FFD98A', 1.6], sparkler: ['#FFE9A8', 1, true], fireworks: ['#FFC9E0', 1.2], 'crescent-moon': ['#E9EEFF', 1.2],
  'milky-way': ['#C9B8FF', 1.2], star: ['#FFE27A', 1], 'shooting-star': ['#FFE27A', 1], 'sun-with-face': ['#FFD86B', 1.6], 'video-game': ['#C8A8FF', 0.9], joystick: ['#FF9AD0', 0.9],
  'gem-stone': ['#A8E6FF', 0.8], 'magic-wand': ['#F7C8FF', 0.9], 'film-projector': ['#FFF0C8', 1.3], trophy: ['#FFE27A', 0.7], crown: ['#FFE27A', 0.7],
}
/** The light a thing gives: { colour, reach, flicker } or null. One of the family's own pictures gives light when it was filed as a light. */
export function glowOf(key, asset = null) {
  if (asset) return asset.cat === 'Lights' ? { colour: WARM, reach: 1.8, flicker: false } : null
  const g = GLOWS[key]
  return g ? { colour: g[0], reach: g[1], flicker: Boolean(g[2]) } : null
}

// What one of the family's own pictures does in a room, kept in its category (academy_assets.cat)
export const ASSET_WAYS = [['Ours', 'It stays put', 'Furniture, and anything else'], ['Animals', 'It wanders', 'A pet or an animal: it strolls about the room'], ['Lights', 'It gives light', 'A lamp, a lantern, a fire: it glows once it’s dark']]

// A ball left alone bounces now and then
const BALLS = new Set(['basketball', 'soccer-ball', 'volleyball', 'american-football', 'baseball', 'softball', 'tennis', 'pool-8-ball', 'balloon'])
/** What a thing that doesn't walk does by itself: a class from academy.css, or null. */
export const idleOf = (key) => (BALLS.has(key) ? 'ac-bounce' : key === 'alarm-clock' || key === 'bell' ? 'ac-ring' : null)

// What rises from a thing: steam from what's hot, bubbles from what's brewing, notes from what plays, hearts and sparkles
const RISES = {
  'hot-beverage': 'steam', teapot: 'steam', 'bowl-with-spoon': 'steam', cooking: 'steam', bathtub: 'steam', bread: 'steam', dumpling: 'steam',
  alembic: 'bubbles', 'test-tube': 'bubbles', 'bubble-tea': 'bubbles', bubbles: 'bubbles', fountain: 'bubbles',
  'musical-keyboard': 'notes', guitar: 'notes', violin: 'notes', trumpet: 'notes', saxophone: 'notes', drum: 'notes', 'long-drum': 'notes', accordion: 'notes', banjo: 'notes', radio: 'notes', microphone: 'notes', 'studio-microphone': 'notes', 'musical-notes': 'notes', headphone: 'notes',
  'crystal-ball': 'sparkles', 'magic-wand': 'sparkles', sparkles: 'sparkles', trophy: 'sparkles', crown: 'sparkles', 'gem-stone': 'sparkles', 'glowing-star': 'sparkles', unicorn: 'sparkles',
  candle: 'flame', 'diya-lamp': 'flame',
}
/** What rises from a thing ('steam', 'bubbles', 'notes', 'sparkles', 'flame'), or null. */
export const risesFrom = (key) => RISES[key] || null
