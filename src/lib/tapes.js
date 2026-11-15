// ============================================
// tapes.js -- the washi tapes that hold Anna's art up
// ============================================
// Anna asked to choose the tape on each of her pieces. Every tape here is drawn in code: a CSS background made of
// gradients and small SVG tiles, nothing downloaded and nothing from an image generator (CLAUDE.md, "Art is
// human-made"). The tiles are measured in the tape's own height (1em = the strip's height: each place that shows a
// tape sets its font-size to it), so a pattern sits the same on her wall, a drawing's page and Home's art card.
//
// The tributes to her favourites are made of colours and plain shapes (cat ears, a cat-eye flick, stars, a
// magnifying glass): never a name, logo, character or anything copied from the shows, music or games they nod to.
// tests/tapes.test.mjs keeps their names clear of the real ones.
//
// What she picks is kept in `drawing_tapes` (one row a drawing, supabase/migrations/20261115090000_drawing_tapes.sql);
// a drawing she hasn't picked for keeps one of the first four, from its id, as it always has (tapeOf).

import { tapeOf } from './drawings.js'

// ---- drawing helpers -------------------------------------------------------------------------------------------

const n2 = (v) => +v.toFixed(2)
/** An SVG tile as a CSS image. Units: 24 is the strip's height. */
const svg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`
/** One background layer from a tile: repeated, sized in the strip's own height. */
const tile = (w, h, body, x = 0, y = 0) => `${svg(w, h, body)} ${n2(x / 24)}em ${n2(y / 24)}em / ${n2(w / 24)}em ${n2(h / 24)}em repeat`
/** Put a motif (drawn round 0,0, about ±10 across) at x,y, scaled and turned. */
const at = (x, y, s, body, r = 0) => `<g transform='translate(${x} ${y}) scale(${s})${r ? ` rotate(${r})` : ''}'>${body}</g>`

/** Small steady numbers for scattering things: the same pattern every time. */
function seeded(seed) {
  let h = 2166136261
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; h ^= h >>> 16; return (h >>> 0) / 4294967296 }
}

/** Bands across the strip, top to bottom, each [colour, share]. */
function bands(list) {
  const total = list.reduce((s, b) => s + (Array.isArray(b) ? b[1] : 1), 0)
  let at0 = 0
  const stops = list.map((b) => {
    const [c, k] = Array.isArray(b) ? b : [b, 1]
    const a = (at0 / total) * 100, z = ((at0 += k) / total) * 100
    return `${c} ${n2(a)}% ${n2(z)}%`
  })
  return `linear-gradient(180deg, ${stops.join(', ')})`
}
/** Diagonal stripes, each `w` (in strip heights) wide. */
const stripes = (colours, w = 0.25, angle = 135) => `repeating-linear-gradient(${angle}deg, ${colours.map((c, i) => `${c} ${n2(i * w)}em ${n2((i + 1) * w)}em`).join(', ')})`
const checks = (a, b, s = 0.5) => `repeating-conic-gradient(${a} 0 25%, ${b} 0 50%) 0 0 / ${s}em ${s}em`
const dots = (c, r = 0.07, s = 0.36, off = true) => `radial-gradient(circle, ${c} ${r}em, transparent ${n2(r + 0.01)}em) 0 0 / ${s}em ${s}em${off ? `, radial-gradient(circle, ${c} ${r}em, transparent ${n2(r + 0.01)}em) ${n2(s / 2)}em ${n2(s / 2)}em / ${s}em ${s}em` : ''}`

// ---- motifs, each drawn round 0,0 ------------------------------------------------------------------------------

const starPts = (n, r1, r2) => Array.from({ length: n * 2 }, (_, i) => { const r = i % 2 ? r2 : r1, a = (Math.PI * i) / n - Math.PI / 2; return `${n2(r * Math.cos(a))},${n2(r * Math.sin(a))}` }).join(' ')
const M = {
  heart: (f) => `<path d='M0 8.5C-5.5 4.6-9.5 1.2-9.5-3.2-9.5-6.4-7.1-8.6-4.5-8.6-2.5-8.6-.9-7.5 0-5.9.9-7.5 2.5-8.6 4.5-8.6 7.1-8.6 9.5-6.4 9.5-3.2 9.5 1.2 5.5 4.6 0 8.5Z' fill='${f}'/>`,
  star: (f, s = 'none') => `<polygon points='${starPts(5, 10, 4.3)}' fill='${f}' stroke='${s}' stroke-width='1.4' stroke-linejoin='round'/>`,
  sparkle: (f) => `<path d='M0-10Q1.3-1.3 10 0Q1.3 1.3 0 10Q-1.3 1.3-10 0Q-1.3-1.3 0-10Z' fill='${f}'/>`,
  dot: (f, r = 2) => `<circle r='${r}' fill='${f}'/>`,
  /** A happy little face: eyes, a smile and pink cheeks, centred at 0,dy */
  face: (ink = '#3A2A33', dy = 0, w = 3.2) => `<g transform='translate(0 ${dy})'><circle cx='-${w}' cy='0' r='1.1' fill='${ink}'/><circle cx='${w}' cy='0' r='1.1' fill='${ink}'/><path d='M-1.3 1.4Q0 2.8 1.3 1.4' fill='none' stroke='${ink}' stroke-width='.9' stroke-linecap='round'/><ellipse cx='-${w + 2}' cy='1.8' rx='1.5' ry='.9' fill='#FF8FB1' opacity='.75'/><ellipse cx='${w + 2}' cy='1.8' rx='1.5' ry='.9' fill='#FF8FB1' opacity='.75'/></g>`,
  sleepy: (ink, dy = 0) => `<g transform='translate(0 ${dy})' fill='none' stroke='${ink}' stroke-width='.9' stroke-linecap='round'><path d='M-4.2 0Q-3 1.2-1.8 0M1.8 0Q3 1.2 4.2 0M-1 2.3Q0 3 1 2.3'/></g>`,
  kitty: (f, ink = '#3A2A33', inner = '#FFB3C8') => `<path d='M-8.6-1.5L-7.6-10L-2.2-6.4ZM8.6-1.5L7.6-10L2.2-6.4Z' fill='${f}'/><path d='M-7.2-3.5L-6.8-7.6L-4.2-5.9ZM7.2-3.5L6.8-7.6L4.2-5.9Z' fill='${inner}'/><ellipse cy='1' rx='9' ry='7.4' fill='${f}'/><circle cx='-3.4' cy='.8' r='1.15' fill='${ink}'/><circle cx='3.4' cy='.8' r='1.15' fill='${ink}'/><path d='M-.8 2.6H.8L0 3.5Z' fill='${inner}'/><path d='M-1.3 3.9Q0 4.9 0 3.6Q0 4.9 1.3 3.9M-9.5 1.8H-6M-9.3 3.8L-6 3.1M9.5 1.8H6M9.3 3.8L6 3.1' fill='none' stroke='${ink}' stroke-width='.6' stroke-linecap='round'/>`,
  cloud: (f) => `<g fill='${f}'><circle cx='-4.5' cy='1.5' r='4'/><circle cx='.5' cy='-1.6' r='5.2'/><circle cx='5.4' cy='1.8' r='3.6'/><rect x='-8.5' y='1.5' width='17.5' height='4' rx='2'/></g>`,
  strawberry: () => `<path d='M0 9C-5 7-8.5 1-8-3.5-7.5-6-4-7 0-6 4-7 7.5-6 8-3.5 8.5 1 5 7 0 9Z' fill='#F0485F'/><g fill='#FFE7A3'><ellipse cx='-3.5' cy='-1.5' rx='.6' ry='.9'/><ellipse cx='0' cy='-2.6' rx='.6' ry='.9'/><ellipse cx='3.5' cy='-1.5' rx='.6' ry='.9'/><ellipse cx='-2' cy='2' rx='.6' ry='.9'/><ellipse cx='2' cy='2' rx='.6' ry='.9'/><ellipse cx='0' cy='5' rx='.6' ry='.9'/></g><path d='M-5.5-6.2L-2.2-5.6 0-9 2.2-5.6 5.5-6.2 3-3.9H-3Z' fill='#4CAF6A'/>`,
  boba: () => `<rect x='1.2' y='-11' width='1.8' height='9' rx='.9' fill='#FF6FA5' transform='rotate(14)'/><path d='M-6-3.5H6L4.6 9.6H-4.6Z' fill='#E8C49B'/><path d='M-7-3.6Q0-10 7-3.6Z' fill='#FFF8EE' opacity='.92'/><rect x='-7.2' y='-4.4' width='14.4' height='1.8' rx='.9' fill='#FFF8EE'/><g fill='#4A2C2A'><circle cx='-2.6' cy='7.4' r='1.3'/><circle cx='.2' cy='8' r='1.3'/><circle cx='2.8' cy='7.2' r='1.3'/><circle cx='-1.2' cy='5.4' r='1.2'/><circle cx='1.6' cy='5.2' r='1.2'/></g>`,
  bunny: (f, inner = '#FFB3C8') => `<ellipse cx='-3.2' cy='-5.4' rx='2.2' ry='5.2' fill='${f}'/><ellipse cx='3.2' cy='-5.4' rx='2.2' ry='5.2' fill='${f}'/><ellipse cx='-3.2' cy='-5' rx='1' ry='3.6' fill='${inner}'/><ellipse cx='3.2' cy='-5' rx='1' ry='3.6' fill='${inner}'/><ellipse cy='3.6' rx='7' ry='6' fill='${f}'/>`,
  mushroom: (cap = '#E8483F') => `<path d='M-3.5 1H3.5L4.2 9H-4.2Z' fill='#FFF1DA'/><path d='M-9.5 1.5A9.5 9 0 0 1 9.5 1.5Z' fill='${cap}'/><g fill='#FFF8EE'><circle cx='-4.6' cy='-2.4' r='1.6'/><circle cx='1' cy='-5' r='1.4'/><circle cx='5' cy='-1.4' r='1.2'/></g>`,
  bolt: (f, s = 'none') => `<path d='M2-10.5L-7.5 2H-1L-3.5 10.5 7.5-3H1Z' fill='${f}' stroke='${s}' stroke-width='1.2' stroke-linejoin='round'/>`,
  note: (f) => `<ellipse cx='-3' cy='6' rx='3.6' ry='2.7' fill='${f}' transform='rotate(-20 -3 6)'/><rect x='-.2' y='-8.5' width='1.8' height='14.5' fill='${f}'/><path d='M1.5-8.5Q7-6.5 6.5-1Q5-4.2 1.5-4.4Z' fill='${f}'/>`,
  pick: (f) => `<path d='M0 9.5C-3.5 6-8.5 0-8.5-4.5-8.5-8.5 8.5-8.5 8.5-4.5 8.5 0 3.5 6 0 9.5Z' fill='${f}'/><path d='M-5-5.5Q0-7.2 5-5.5' fill='none' stroke='#FFF8EE' stroke-width='.9' opacity='.6' stroke-linecap='round'/>`,
  flame: () => `<path d='M0 10C-6.5 10-8.5 4.5-6.5-.5-5.5-3.5-3-4.5-3-9-.2-7 .8-4.2 1.2-2.2 2.2-4.4 3.4-5.6 4.4-6.8 6.6-3 8.6.4 7.2 5 6.2 8.2 3.2 10 0 10Z' fill='#FF5A1F'/><path d='M0 10C-3.6 10-4.6 6.6-3.4 3.8-2.6 2-1.2 1.4-1 -1.4.8-.2 1.6 1.8 1.8 3 2.6 2 3.2 1.4 3.6.6 4.8 3 5.2 5.4 4.2 7.6 3.4 9.2 1.8 10 0 10Z' fill='#FFD23F'/>`,
  guitar: (f) => `<rect x='-1' y='-11' width='2' height='10' fill='#6B4426'/><rect x='-1.8' y='-12.5' width='3.6' height='3' rx='.6' fill='#2B1A10'/><circle cy='-.5' r='4.2' fill='${f}'/><circle cy='4.6' r='5.6' fill='${f}'/><circle cy='2.2' r='1.6' fill='#2B1A10'/><rect x='-2.6' y='5.6' width='5.2' height='1.2' fill='#2B1A10'/>`,
  pixelHeart: (f, px = 2.4) => {
    const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
    return rows.flatMap((r, y) => [...r].map((c, x) => (c === 'X' ? `<rect x='${n2((x - 3.5) * px)}' y='${n2((y - 3) * px)}' width='${px + 0.05}' height='${px + 0.05}' fill='${f}'/>` : ''))).join('')
  },
  catEars: (f, inner) => `<path d='M-9.5 5L-7.4-8.5-.8-1.6Z M9.5 5L7.4-8.5.8-1.6Z' fill='${f}'/><path d='M-7.4 1.6L-6.4-4.8-3-1.4ZM7.4 1.6L6.4-4.8 3-1.4Z' fill='${inner}'/><path d='M-10 5.6Q0-1.6 10 5.6' fill='none' stroke='${f}' stroke-width='1.6' stroke-linecap='round'/>`,
  paw: (f) => `<g fill='${f}'><ellipse cy='3.2' rx='4.6' ry='3.8'/><circle cx='-5.2' cy='-2.4' r='1.9'/><circle cx='-1.9' cy='-5.6' r='2'/><circle cx='1.9' cy='-5.6' r='2'/><circle cx='5.2' cy='-2.4' r='1.9'/></g>`,
  daisy: (petal = '#FFF8EE', mid = '#F6C744') => `${Array.from({ length: 8 }, (_, i) => `<ellipse cy='-5.2' rx='2.4' ry='4.4' fill='${petal}' transform='rotate(${i * 45})'/>`).join('')}<circle r='3' fill='${mid}'/>`,
  butterfly: (a, b) => `<ellipse cx='-4.6' cy='-3' rx='4.6' ry='4' fill='${a}' transform='rotate(-20 -4.6 -3)'/><ellipse cx='4.6' cy='-3' rx='4.6' ry='4' fill='${a}' transform='rotate(20 4.6 -3)'/><ellipse cx='-3.6' cy='3.6' rx='3' ry='3.2' fill='${b}'/><ellipse cx='3.6' cy='3.6' rx='3' ry='3.2' fill='${b}'/><rect x='-.8' y='-6' width='1.6' height='13' rx='.8' fill='#3A2A33'/><path d='M-.4-6Q-2-9-3.4-9.4M.4-6Q2-9 3.4-9.4' fill='none' stroke='#3A2A33' stroke-width='.6' stroke-linecap='round'/>`,
  moon: (f) => `<path d='M3.5-9.4A9.6 9.6 0 1 0 3.5 9.4 7.6 7.6 0 1 1 3.5-9.4Z' fill='${f}'/>`,
  planet: (f, ring) => `<circle r='5.6' fill='${f}'/><ellipse rx='10' ry='2.8' fill='none' stroke='${ring}' stroke-width='1.4' transform='rotate(-18)'/><path d='M-5.4-1.3A5.6 5.6 0 0 1 5.4-1.3' fill='${f}' transform='rotate(-18)'/>`,
  crown: (f) => `<path d='M-8.5 5.5V-5L-4.2 0 0-7.5 4.2 0 8.5-5V5.5Z' fill='${f}'/><circle cy='-7.5' r='1.4' fill='${f}'/><circle cx='-8.5' cy='-5' r='1.2' fill='${f}'/><circle cx='8.5' cy='-5' r='1.2' fill='${f}'/>`,
  gem: (f, hi = '#FFF8EE') => `<path d='M-8.5-2.5L-4.5-7.5H4.5L8.5-2.5 0 8.5Z' fill='${f}'/><path d='M-8.5-2.5H8.5M-4.5-7.5L-2.2-2.5 0 8.5 2.2-2.5 4.5-7.5' fill='none' stroke='${hi}' stroke-width='.7' opacity='.7'/>`,
  donut: (icing, hole) => `<circle r='8.4' fill='#E2A86A'/><path d='M-7.2-1.4C-7.6-5.6-4-8 0-8S7.8-5.6 7.4-1.8C7 1.8 6 3.2 4.6 2.2 3.6 4.4 2 3 1 4.6 0 3.2-1.8 5-3 3.2-4.6 4.2-6.8 2.6-7.2-1.4Z' fill='${icing}'/><circle r='2.6' fill='${hole}'/><g stroke-width='1.1' stroke-linecap='round'><path d='M-4-4.6l1.2.8' stroke='#FFF8EE'/><path d='M3.4-5l-.6 1.2' stroke='#6FD1E8'/><path d='M5-.6l1.3.2' stroke='#FFE066'/><path d='M-5.6.2l.8-1' stroke='#7CD992'/></g>`,
  icecream: (scoop) => `<path d='M-4.6 0L0 10.5 4.6 0Z' fill='#E2A86A'/><path d='M-3 2.4L1.6 6.6M3 2.4L-1.6 6.6' stroke='#B97C43' stroke-width='.6'/><circle cy='-3.6' r='5.8' fill='${scoop}'/><path d='M-5.8-2.4Q-4.2 0-2.6-1.4-1 .6.6-1.2 2.2.6 3.6-1.4 5 .2 5.8-2.4' fill='${scoop}'/>`,
  cherries: () => `<path d='M-3.8 4.6Q-2-4 3-8.6M3.6 5.4Q3.2-2 3-8.6' fill='none' stroke='#3E8E4E' stroke-width='1.1' stroke-linecap='round'/><path d='M3-8.6Q6.5-9.6 8-6.8 5-6 3-8.6Z' fill='#4CAF6A'/><circle cx='-3.8' cy='5.6' r='3.6' fill='#D7263D'/><circle cx='3.6' cy='6.2' r='3.6' fill='#E63950'/><circle cx='-5' cy='4.4' r='1' fill='#FFF8EE' opacity='.6'/><circle cx='2.4' cy='5' r='1' fill='#FFF8EE' opacity='.6'/>`,
  melon: () => `<path d='M-10-3A10 10 0 0 0 10-3Z' fill='#3E9B4F'/><path d='M-8.6-3A8.6 8.6 0 0 0 8.6-3Z' fill='#E9F7D9'/><path d='M-7.8-3A7.8 7.8 0 0 0 7.8-3Z' fill='#FF5D73'/><g fill='#2B1A10'><ellipse cx='-3.5' cy='0' rx='.6' ry='1'/><ellipse cx='0' cy='1.8' rx='.6' ry='1'/><ellipse cx='3.5' cy='0' rx='.6' ry='1'/></g>`,
  lemon: () => `<circle r='8.6' fill='#F6C744'/><circle r='7.4' fill='#FFF3B0'/>${Array.from({ length: 8 }, (_, i) => `<path d='M0 0L-2.5-6.4A6.8 6.8 0 0 1 2.5-6.4Z' fill='#FFE066' transform='rotate(${i * 45})'/>`).join('')}<circle r='1' fill='#FFF3B0'/>`,
  magnifier: (f) => `<circle cx='-2' cy='-2' r='5.4' fill='none' stroke='${f}' stroke-width='2'/><path d='M2 2L8.4 8.4' stroke='${f}' stroke-width='3' stroke-linecap='round'/><path d='M-5-3.6A3.6 3.6 0 0 1-3.4-5.2' fill='none' stroke='${f}' stroke-width='.9' stroke-linecap='round'/>`,
  query: (f) => `<path d='M-4-4.4A4.2 4.2 0 1 1 1.4-.4C.2.6 0 1.4 0 3.6' fill='none' stroke='${f}' stroke-width='2.2' stroke-linecap='round'/><circle cy='7.8' r='1.5' fill='${f}'/>`,
  gadget: (body, screen, light) => `<path d='M3-5.5L6-10.5' stroke='${body}' stroke-width='1' stroke-linecap='round'/><circle cx='6' cy='-10.5' r='1.4' fill='${light}'/><rect x='-6.5' y='-5.5' width='13' height='15' rx='2' fill='${body}'/><rect x='-4.5' y='-3.5' width='9' height='5.5' rx='1' fill='${screen}'/><path d='M-3.4-.8l1.6-1.6 1.6 1.6 1.6-1.6 1.6 1.6' fill='none' stroke='${body}' stroke-width='.6'/><circle cx='-2.6' cy='5.4' r='1.4' fill='${light}'/><circle cx='1.2' cy='5.4' r='1' fill='${screen}'/><circle cx='3.6' cy='5.4' r='1' fill='${screen}'/>`,
  flick: (f) => `<path d='M-10.5 1.6Q-2 4.6 6.4-1.4L10.5-6 7.6 1.2Q-.6 6.6-10.5 1.6Z' fill='${f}'/>`,
  rainbow: (cols) => cols.map((c, i) => `<path d='M${-9 + i * 1.6} 5A${9 - i * 1.6} ${9 - i * 1.6} 0 0 1 ${9 - i * 1.6} 5' fill='none' stroke='${c}' stroke-width='1.7'/>`).join(''),
  mochi: (f) => `<path d='M-8.5 5.5C-9.5-2-5-6.5 0-6.5S9.5-2 8.5 5.5Z' fill='${f}'/>`,
  rosette: (spot, mid) => `<ellipse rx='3.8' ry='2.9' fill='${mid}' stroke='${spot}' stroke-width='1.5' stroke-dasharray='4.6 2'/>`,
  sprinkle: (f, r) => `<rect x='-2' y='-.6' width='4' height='1.2' rx='.6' fill='${f}' transform='rotate(${r})'/>`,
}

/** A scatter of glitter in a tile: tiny dots and a few four-point sparks, the same every time. */
function glitterBody(seed, colours, { w = 24, h = 24, n = 18, sparks = 3 } = {}) {
  const r = seeded(seed)
  let s = ''
  for (let i = 0; i < n; i++) s += `<circle cx='${n2(r() * w)}' cy='${n2(r() * h)}' r='${n2(0.35 + r() * 0.75)}' fill='${colours[i % colours.length]}' opacity='${n2(0.45 + r() * 0.55)}'/>`
  for (let i = 0; i < sparks; i++) s += at(n2(2 + r() * (w - 4)), n2(2 + r() * (h - 4)), n2(0.16 + r() * 0.14), M.sparkle(colours[0]))
  return s
}
const glitter = (seed, colours, opts) => tile(opts && opts.w ? opts.w : 24, opts && opts.h ? opts.h : 24, glitterBody(seed, colours, opts))

/** Mirror tiles for the disco tape: squares of silver, each a different shine. */
function discoBody() {
  const r = seeded('disco')
  let s = ''
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const g = Math.round(150 + r() * 100)
    s += `<rect x='${x * 6 + 0.4}' y='${y * 6 + 0.4}' width='5.2' height='5.2' fill='rgb(${g},${g},${Math.min(255, g + 14)})'/>`
  }
  return s
}

/** Anna's three cats as the Pets launch draws them (src/places/pets/PetsLaunch.jsx, LOOKS): the same colours, drawn
 *  round 0,0 at the size of a head. Kona is white with blue eyes and an orange splotch, Portia a black tuxedo, Goldie a calico. */
const CAT = {
  kona: { fur: '#FCFBF9', earL: '#FCFBF9', earR: '#FCFBF9', inner: '#F3AABD', innerR: '#F3AABD', line: '#D6CDE0', eyes: 'blue',
    marks: "<path d='M20 44C18 36 24 31 32 31C40 30 46 35 44 42C42 47 36 48 30 47C24 47 21 47 20 44Z' fill='#EA9340'/><path d='M29 38C32 33 40 34 40 39C39 44 31 44 29 38Z' fill='#2B2330'/>" },
  portia: { fur: '#2B2330', earL: '#2B2330', earR: '#2B2330', inner: '#8A5B7A', innerR: '#8A5B7A', line: null, eyes: 'amber',
    marks: "<path d='M47.5 36L52.5 36L54 66L46 66Z' fill='#FCFBF9'/><path d='M30 74C34 67 44 66 50 70C56 66 66 67 70 74C68 85 59 92 50 92C41 92 32 85 30 74Z' fill='#FCFBF9'/>" },
  goldie: { fur: '#F6E8CF', earL: '#EA9340', earR: '#2B2330', inner: '#EBA3B8', innerR: '#7A5A6E', line: null, eyes: 'dark',
    marks: "<ellipse cx='29' cy='40' rx='16' ry='13' fill='#EA9340'/><ellipse cx='73' cy='41' rx='14' ry='11' fill='#2B2330'/>" },
}
const CAT_EYES = { blue: '#5AA7E8', amber: '#E8B53A' }
/** One of the cats' heads, centred on 0,0 and about 17 strip-heights across at the scale the tape uses. */
const catHead = (look) => {
  const c = CAT[look], stroke = c.line ? ` stroke='${c.line}' stroke-width='1.1' stroke-linejoin='round'` : ''
  const eyes = [33, 67].map((x) => (CAT_EYES[c.eyes]
    ? `<ellipse cx='${x}' cy='58' rx='7.6' ry='9.4' fill='${CAT_EYES[c.eyes]}'/><ellipse cx='${x}' cy='59' rx='3.6' ry='6.6' fill='#1B1824'/><circle cx='${x + 2.4}' cy='54.6' r='2.6' fill='#FFFFFF'/>`
    : `<ellipse cx='${x}' cy='58' rx='6.5' ry='8.5' fill='#2A2230'/><circle cx='${x + 2.2}' cy='55' r='2.4' fill='#FFFFFF'/>`)).join('')
  return `<g transform='translate(-50 -60)'>`
    + `<polygon points='12,42 18,6 47,28' fill='${c.earL}'${stroke}/><polygon points='20,35 22,16 38,27' fill='${c.inner}'/>`
    + `<polygon points='88,42 82,6 53,28' fill='${c.earR}'${stroke}/><polygon points='80,35 78,16 62,27' fill='${c.innerR}'/>`
    + `<ellipse cx='50' cy='60' rx='41' ry='32' fill='${c.fur}'${stroke}/>${c.marks}${eyes}`
    + `<path d='M46 68h8l-4 5z' fill='#E58AA5'/><path d='M50 73q-5 5-10 2M50 73q5 5 10 2' fill='none' stroke='#2A2230' stroke-width='1.7' stroke-linecap='round'/>`
    + `</g>`
}

// ---- fruit: each drawn round 0,0 at about ±9, like the motifs above ---------------------------------------------------

const slice = (rim, flesh, seg) => `<circle r='8.8' fill='${rim}'/><circle r='7.4' fill='${flesh}'/>`
  + Array.from({ length: 6 }, (_, k) => `<path d='M0 0L${n2(7.4 * Math.cos((k * Math.PI) / 3))} ${n2(7.4 * Math.sin((k * Math.PI) / 3))}' stroke='${seg}' stroke-width='1.2'/>`).join('')
  + `<circle r='1' fill='${seg}'/>`
const apple = (f, hi) => `<path d='M0-5.5C-3-8-9-7.5-9 .5C-9 6-5.5 9-3 9C-1.5 9-1 7.8 0 7.8S1.5 9 3 9C5.5 9 9 6 9 .5C9-7.5 3-8 0-5.5Z' fill='${f}'/>`
  + `<path d='M0-5.5Q0-8 .8-9.8' stroke='#6B4226' stroke-width='1' fill='none'/><path d='M1-8.2Q4-11.2 7.4-9.2Q4.4-7 1-8.2Z' fill='#4CAF6A'/>`
  + `<path d='M-5.5-1Q-6.4 2-5.2 4.5' stroke='${hi}' stroke-width='1.3' fill='none' stroke-linecap='round' opacity='.6'/>`
const drupelets = (f, hi) => [[-3.6, -5], [0, -5.2], [3.6, -5], [-5.6, -0.8], [-1.8, -1.2], [1.8, -1.2], [5.6, -0.8], [-3.6, 3.4], [0, 3.2], [3.6, 3.4], [0, 7.2]]
  .map(([x, y]) => `<circle cx='${x}' cy='${y}' r='2.1' fill='${f}'/><circle cx='${n2(x - 0.6)}' cy='${n2(y - 0.6)}' r='0.5' fill='${hi}'/>`).join('')
  + `<path d='M1-8.4Q3.5-11 6.8-9.6Q4-7.4 1-8.4Z' fill='#4CAF6A'/>`
const FRUIT = {
  apple: apple('#E5484D', '#FFF8EE'),
  greenApple: apple('#8BC34A', '#FFF8EE'),
  pear: `<path d='M0-8.5C-1.6-8.5-1.8-6-1.8-4.2C-5.8-4-8.6-.5-8.2 3C-7.8 7-4.4 9 0 9S7.8 7 8.2 3C8.6-.5 5.8-4 1.8-4.2C1.8-6 1.6-8.5 0-8.5Z' fill='#C6D96B'/><path d='M0-8.5Q.8-11 2.8-11.4' stroke='#6B4226' stroke-width='1' fill='none' stroke-linecap='round'/><path d='M-4.8 2Q-5 5-3.2 6.2' stroke='#FFFFFF' stroke-width='1.1' fill='none' stroke-linecap='round' opacity='.55'/>`,
  orange: slice('#FF8A1C', '#FFF3DC', '#FF8A1C'),
  lime: slice('#6DB33F', '#EEF9CF', '#6DB33F'),
  grapes: `<path d='M0-9Q.6-11.2 3-11.4' stroke='#6B4226' stroke-width='1' fill='none'/>`
    + [[-4, -5], [0, -5], [4, -5], [-2, 0], [2, 0], [0, 4.4]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='2.7' fill='#7B4FB8'/><circle cx='${n2(x - 0.8)}' cy='${n2(y - 0.9)}' r='0.6' fill='#FFFFFF' opacity='.7'/>`).join(''),
  banana: `<path d='M-8.5-6.5Q-10 4 1 8.2Q7.8 9.5 9.5-3.8Q4 2.6 0 2.4Q-4.2 1.8-8.5-6.5Z' fill='#FFE14D'/><path d='M-8.5-6.5l-1.8-1.8' stroke='#6B4226' stroke-width='1.6' stroke-linecap='round'/><path d='M9.5-3.8l1.2-1.4' stroke='#6B4226' stroke-width='1.4' stroke-linecap='round'/><path d='M-4-4.6Q-5 .5-1.2 4.4' stroke='#FFF6B8' stroke-width='1.2' fill='none' stroke-linecap='round'/>`,
  peach: `<path d='M0-6.5C-4-9-9-7-9-1C-9 6-4.5 9 0 9C4.5 9 9 6 9-1C9-7 4-9 0-6.5Z' fill='#FF9E7A'/><path d='M0-6.5Q-2 1 0 9' stroke='#E07A5F' stroke-width='1' fill='none'/><path d='M1.2-7.6Q4.6-10.6 7.8-8.6Q4.6-6.4 1.2-7.6Z' fill='#4CAF6A'/>`,
  pineapple: `<ellipse rx='6.4' ry='8.6' fill='#F6B73C'/><path d='M-6.4-3L0-9.4 6.4-3M-6.4 3L0-3.4 6.4 3M-6.4 9L0 2.6 6.4 9' fill='none' stroke='#C98B1A' stroke-width='.9'/><path d='M-3-8.2L-5.6-12.6-1.8-9ZM-.6-8.8L0-13.6 1.2-9ZM2.4-8.4L5.4-12.6 3.4-8.6Z' fill='#4CAF6A'/>`,
  kiwi: `<circle r='8.8' fill='#8B5A2B'/><circle r='7.5' fill='#8CC63F'/><circle r='5.4' fill='#C9E77A'/><circle r='2.2' fill='#F4F9C9'/>`
    + Array.from({ length: 12 }, (_, k) => `<circle cx='${n2(4.6 * Math.cos((k * Math.PI) / 6))}' cy='${n2(4.6 * Math.sin((k * Math.PI) / 6))}' r='0.55' fill='#2B2330'/>`).join(''),
  mango: `<ellipse rx='6.8' ry='8.8' fill='#FFC145' transform='rotate(-22)'/><ellipse cx='1.2' cy='1.6' rx='4.2' ry='6.2' fill='#F5703C' opacity='.45' transform='rotate(-22)'/><path d='M1.6-8.1Q3.8-10.4 6-9.4' stroke='#6B4226' stroke-width='1.1' fill='none' stroke-linecap='round'/>`,
  blueberries: [[-4, -2], [3.5, -2.5], [-0.5, 3.2], [5, 3], [-5, 4.4]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3.2' fill='#3D5A9A'/><circle cx='${n2(x - 1)}' cy='${n2(y - 1.1)}' r='0.8' fill='#A9BDF0'/>`).join(''),
  raspberry: drupelets('#E0245E', '#FFB3C8'),
  blackberry: drupelets('#2B2330', '#7A6A8A'),
  plum: `<ellipse rx='7.2' ry='7.8' fill='#6B2F7E'/><ellipse cx='-2.4' cy='-2.6' rx='1.8' ry='2.6' fill='#B98BCF' opacity='.7'/><path d='M0-7.6Q.6-9.6 2.4-10' stroke='#4E7A2A' stroke-width='1' fill='none' stroke-linecap='round'/><path d='M1.4-8.6Q4-10.4 6-8.8Q3.6-7.2 1.4-8.6Z' fill='#4CAF6A'/>`,
  pomegranate: `<circle r='8' fill='#D7263D'/><path d='M-3-7.2L-3.4-10.4 0-8.2 3.4-10.4 3-7.2Z' fill='#9E1B2C'/><circle cx='-2.6' cy='-2.8' r='1.3' fill='#FF8FA0' opacity='.7'/><circle cx='2.4' cy='1.6' r='1' fill='#FF8FA0' opacity='.5'/>`,
  avocado: `<path d='M0-9C-4-9-6-4-6 1C-6 6-3 9 0 9C3 9 6 6 6 1C6-4 4-9 0-9Z' fill='#3E6B2A'/><path d='M0-6.2C-2.6-6.2-3.6-3-3.6 .2C-3.6 3.2-2 5.2 0 5.2C2 5.2 3.6 3.2 3.6 .2C3.6-3 2.6-6.2 0-6.2Z' fill='#E6F09A'/><circle cy='1.6' r='3.2' fill='#8B4A2B'/><circle cx='-1' cy='.4' r='.9' fill='#B77A4E'/>`,
  coconut: `<circle r='8.4' fill='#8B5A2B'/><circle cx='-2.4' cy='-2.6' r='3.2' fill='#B98352' opacity='.6'/><circle cx='-2.2' cy='3.4' r='.9' fill='#3D2412'/><circle cx='1.2' cy='3.4' r='.9' fill='#3D2412'/><circle cx='-.5' cy='4.9' r='.9' fill='#3D2412'/>`,
  fig: `<path d='M0-8C-3.8-8-6-2.4-6 1.6C-6 6.2-3.2 9 0 9C3.2 9 6 6.2 6 1.6C6-2.4 3.8-8 0-8Z' fill='#8A5A4A'/><path d='M-3.2-4.4Q-3.4 0-2 4.6' stroke='#B98BCF' stroke-width='.9' fill='none' opacity='.7'/><path d='M0-8Q.4-10 2.6-10.4' stroke='#4E7A2A' stroke-width='1.2' fill='none' stroke-linecap='round'/>`,
  dragon: `<ellipse rx='6.6' ry='8' fill='#E8488A'/><path d='M-4.6-5.6L-7.6-8.2-2.2-7.6ZM0-7.6L-1-10.4 1.4-7.8ZM4.6-5.6L7.6-8.2 2.2-7.6Z' fill='#7CB342'/>`
    + [[-2.8, -1], [1.2, -2.6], [3.2, 1.6], [-1.4, 2.4], [0.4, 5.2], [-3.6, 4.6], [1.8, 0.4]].map(([x, y]) => `<circle cx='${x}' cy='${y}' r='0.7' fill='#2B2330'/>`).join(''),
}
/** A fruit tape: two of the fruit on a plain ground. */
const fruitTape = (id, name, tint, motif, ground) => ({ id, name, group: 'fruit', tint, bg: `${tile(36, 24, at(9, 12, 0.75, motif) + at(27, 12, 0.75, motif))}, ${ground}` })

// ---- the tapes ---------------------------------------------------------------------------------------------------

/** The groups the picker shows, in order. */
export const GROUPS = [
  ['plain', 'Plain colours'],
  ['rainbow', 'Rainbows and Pride'],
  ['glitter', 'Glitter and shine'],
  ['kawaii', 'Kawaii'],
  ['rock', 'Rockstar'],
  ['fruit', 'Fruit'],
  ['misc', 'Misc'],
  ['faves', 'Her favourites'],
]

const PRIDE = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982']
const PASTEL = ['#FFB3BA', '#FFD8A8', '#FFF3A3', '#BDEFC2', '#B5D8FF', '#D9C2FF']
const BRIGHT = ['#FF4D6D', '#FF9F1C', '#FFE14D', '#3DDC97', '#3A86FF', '#9B5DE5']

/**
 * Every tape: { id, name, group, tint, bg, glitter?, line? }. `bg` is the CSS background; `tint` is its main colour
 * (for the academy's tiny tabs and the picker's outline); `glitter` is a twinkle that plays over it (opacity only);
 * `line` is a few words the picker shows once it's picked. The first four are the tapes every drawing had before she
 * could choose, in the order tapeOf counts them.
 */
export const TAPES = [
  // Plain, sheer colours
  { id: 'bubblegum', name: 'Bubblegum', group: 'plain', tint: '#F29CB7', bg: '#F29CB7' },
  { id: 'lemonade', name: 'Lemonade', group: 'plain', tint: '#F6D94D', bg: '#F6D94D' },
  { id: 'mint', name: 'Mint', group: 'plain', tint: '#8FD3B6', bg: '#8FD3B6' },
  { id: 'lilac', name: 'Lilac', group: 'plain', tint: '#B9A4E6', bg: '#B9A4E6' },
  { id: 'sky', name: 'Sky blue', group: 'plain', tint: '#8EC9F2', bg: '#8EC9F2' },
  { id: 'peach', name: 'Peach', group: 'plain', tint: '#FFBE98', bg: '#FFBE98' },
  { id: 'coral', name: 'Coral', group: 'plain', tint: '#FF7F6E', bg: '#FF7F6E' },
  { id: 'midnight', name: 'Midnight', group: 'plain', tint: '#2E3A6E', bg: '#2E3A6E' },

  // Rainbows and Pride
  { id: 'rainbow', name: 'Rainbow stripes', group: 'rainbow', tint: '#FF9F1C', bg: stripes(BRIGHT, 0.22) },
  { id: 'pastel-rainbow', name: 'Pastel rainbow', group: 'rainbow', tint: '#FFD8A8', bg: bands(PASTEL) },
  { id: 'pride', name: 'Pride', group: 'rainbow', tint: '#FFED00', bg: bands(PRIDE), line: 'Love is love.' },
  { id: 'pastel-pride', name: 'Soft Pride', group: 'rainbow', tint: '#FFF3A3', bg: `${dots('rgba(255,248,238,.7)', 0.05, 0.3)}, ${bands(PASTEL)}`, line: 'Love is love, in sherbet.' },
  { id: 'trans', name: 'Trans Pride', group: 'rainbow', tint: '#5BCEFA', bg: bands(['#5BCEFA', '#F5A9B8', '#FFF8EE', '#F5A9B8', '#5BCEFA']), line: 'Be exactly who you are.' },
  { id: 'bi', name: 'Bi Pride', group: 'rainbow', tint: '#9B4F96', bg: bands([['#D60270', 2], ['#9B4F96', 1], ['#0038A8', 2]]) },
  { id: 'pan', name: 'Pan Pride', group: 'rainbow', tint: '#FFD800', bg: bands(['#FF218C', '#FFD800', '#21B1FF']) },
  { id: 'rainbow-hearts', name: 'Rainbow hearts', group: 'rainbow', tint: '#FF8FB1', bg: `${tile(48, 24, BRIGHT.map((c, i) => at(4 + i * 8, i % 2 ? 15 : 9, 0.34, M.heart(c))).join(''))}, #FFF1F6` },
  { id: 'rainbow-arcs', name: 'Over the rainbow', group: 'rainbow', tint: '#9AD7F5', bg: `${tile(30, 24, `${at(15, 13, 0.95, M.rainbow(BRIGHT))}${at(7, 18, 0.22, M.cloud('#FFF8EE'))}${at(23, 18, 0.22, M.cloud('#FFF8EE'))}`)}, linear-gradient(#9AD7F5, #CBEBFB)` },
  { id: 'unicorn', name: 'Unicorn swirl', group: 'rainbow', tint: '#E8C6FF', bg: `${glitter('unicorn', ['#FFF8EE', '#FFE9A8'], { n: 10, sparks: 3 })}, ${stripes(['#FFC6E8', '#E8C6FF', '#C6E2FF', '#C6FFE4', '#FFF3C4'], 0.2, 120)}`, glitter: true },

  // Glitter and shine
  { id: 'gold-glitter', name: 'Gold glitter', group: 'glitter', tint: '#E3B23C', bg: `${glitter('gold', ['#FFF6C8', '#FFFFFF', '#C98E1C'], { n: 26, sparks: 3 })}, linear-gradient(100deg, #C98E1C, #F4D774 35%, #D9A42C 60%, #F7E08E 85%, #C98E1C)`, glitter: true },
  { id: 'silver-glitter', name: 'Silver glitter', group: 'glitter', tint: '#C7CCD6', bg: `${glitter('silver', ['#FFFFFF', '#E8ECF4', '#8D96A8'], { n: 26, sparks: 3 })}, linear-gradient(100deg, #9AA3B4, #E9EDF4 35%, #B6BDCB 60%, #F2F4F8 85%, #9AA3B4)`, glitter: true },
  { id: 'pink-glitter', name: 'Pink glitter', group: 'glitter', tint: '#FF6FB5', bg: `${glitter('pink', ['#FFFFFF', '#FFD1EA', '#C2185B'], { n: 26, sparks: 3 })}, linear-gradient(100deg, #E0479E, #FF9ACF 35%, #F062AE 60%, #FFB8DC 85%, #E0479E)`, glitter: true },
  { id: 'holo', name: 'Holographic', group: 'glitter', tint: '#D6C8FF', bg: `${glitter('holo', ['#FFFFFF', '#FFF8EE'], { n: 16, sparks: 4 })}, linear-gradient(115deg, #FFC6E8, #C6E2FF 22%, #D6FFE4 40%, #FFF3C4 58%, #E8C6FF 76%, #C6F4FF)`, glitter: true },
  { id: 'galaxy', name: 'Galaxy', group: 'glitter', tint: '#5B3AA8', bg: `${glitter('galaxy', ['#FFFFFF', '#FFE9A8', '#B5D8FF'], { n: 22, sparks: 4 })}, radial-gradient(ellipse at 25% 40%, rgba(255,105,180,.55), transparent 55%), radial-gradient(ellipse at 75% 60%, rgba(80,160,255,.5), transparent 55%), linear-gradient(#1B1238, #2C1B5C)`, glitter: true },
  { id: 'rose-gold', name: 'Rose gold', group: 'glitter', tint: '#E8A99A', bg: `${glitter('rose', ['#FFFFFF', '#FFE3D8', '#B8705C'], { n: 24, sparks: 3 })}, linear-gradient(100deg, #C98272, #F4C7B8 35%, #D9998A 60%, #F8D8CC 85%, #C98272)`, glitter: true },
  { id: 'disco', name: 'Disco ball', group: 'glitter', tint: '#C9CFDA', bg: `${glitter('disco-g', ['#FFFFFF', '#FFFFFF', '#CDE8FF'], { n: 8, sparks: 3 })}, ${tile(24, 24, discoBody())}, #6E7586`, glitter: true },
  { id: 'mermaid', name: 'Mermaid scales', group: 'glitter', tint: '#5CC8C2', bg: `${glitter('mermaid', ['#FFFFFF', '#E6FFFB'], { n: 12, sparks: 2 })}, ${tile(12, 12, `<g fill='none' stroke='rgba(255,248,238,.55)' stroke-width='1'><path d='M0 12A6 6 0 0 1 12 12M-6 6A6 6 0 0 1 6 6M6 6A6 6 0 0 1 18 6M0 0A6 6 0 0 1 12 0'/></g>`)}, linear-gradient(100deg, #3FB8B0, #7C9CF0 50%, #B486E6)`, glitter: true },

  // Kawaii
  { id: 'kitties', name: 'Kitty faces', group: 'kawaii', tint: '#FFC4D6', bg: `${tile(26, 24, at(13, 12.5, 0.85, M.kitty('#FFF8EE')))}, #FFC4D6`, line: 'Meow.' },
  { id: 'clouds', name: 'Happy clouds', group: 'kawaii', tint: '#A8DAF7', bg: `${tile(30, 24, at(15, 12, 0.95, M.cloud('#FFF8EE') + M.face('#3A4A66', 1.4, 2.4)))}, #A8DAF7` },
  { id: 'strawberries', name: 'Strawberry milk', group: 'kawaii', tint: '#FFC8D6', bg: `${tile(26, 24, at(13, 12, 0.85, M.strawberry() + M.face('#3A2A33', 2, 2.4)))}, ${dots('#FFF8EE', 0.04, 0.24)}, #FFC8D6` },
  { id: 'boba', name: 'Boba time', group: 'kawaii', tint: '#B9E8D2', bg: `${tile(24, 24, at(12, 12.5, 0.85, M.boba() + M.face('#4A2C2A', 1.5, 2.2)))}, #B9E8D2` },
  { id: 'bunnies', name: 'Bunny hop', group: 'kawaii', tint: '#D7C6F5', bg: `${tile(24, 24, at(12, 13, 0.85, M.bunny('#FFF8EE') + M.face('#3A2A33', 3.6, 2.4)), 0, 0)}, #D7C6F5` },
  { id: 'mushrooms', name: 'Mushroom friends', group: 'kawaii', tint: '#FFE6C7', bg: `${tile(26, 24, at(13, 12, 0.85, M.mushroom() + M.face('#3A2A33', 4.8, 1.8)))}, #FFE6C7` },
  { id: 'moons', name: 'Sleepy moons', group: 'kawaii', tint: '#3B3F7A', bg: `${tile(32, 24, `${at(11, 12, 0.85, M.moon('#FFE9A8') + at(-2.4, 1.4, 0.8, M.sleepy('#6B5A2A')))}${at(25, 6, 0.24, M.star('#FFE9A8'))}${at(27, 18, 0.16, M.star('#FFF8EE'))}`)}, #3B3F7A` },
  { id: 'paws', name: 'Paw prints', group: 'kawaii', tint: '#FFD3B5', bg: `${tile(32, 24, `${at(8, 8, 0.5, M.paw('#C9715A'), -15)}${at(24, 16, 0.5, M.paw('#C9715A'), 15)}`)}, #FFD3B5` },
  { id: 'happy-stars', name: 'Happy stars', group: 'kawaii', tint: '#E3D4FF', bg: `${tile(26, 24, at(13, 12.5, 0.9, M.star('#FFE066') + M.face('#5A4300', 0.6, 2)))}, #E3D4FF` },
  { id: 'donuts', name: 'Sweet donuts', group: 'kawaii', tint: '#BFEBDD', bg: `${tile(26, 24, at(13, 12, 0.85, M.donut('#FF8FC2', '#BFEBDD')))}, #BFEBDD` },
  { id: 'mochi', name: 'Mochi friends', group: 'kawaii', tint: '#FFD6E4', bg: `${tile(48, 24, ['#FFF8EE', '#C9F0D8', '#FFF8EE', '#F6D4F0'].map((c, i) => at(6 + i * 12, 14, 0.55, M.mochi(c) + M.face('#3A2A33', 0.8, 2.6))).join(''))}, #FFD6E4` },
  { id: 'ice-cream', name: 'Ice cream party', group: 'kawaii', tint: '#FFF0C9', bg: `${tile(48, 24, ['#FF9EC4', '#B9E8D2', '#C9B6FF', '#FFE08A'].map((c, i) => at(6 + i * 12, 12.5, 0.85, M.icecream(c) + at(0, -3.4, 0.7, M.face('#3A2A33', 0, 2.4)))).join(''))}, #FFF0C9` },

  // Rockstar
  { id: 'lightning', name: 'Lightning bolts', group: 'rock', tint: '#FFE14D', bg: `${tile(28, 24, `${at(9, 12, 0.85, M.bolt('#FFE14D'), 10)}${at(22, 7, 0.3, M.star('#FF4FA3'))}${at(22, 18, 0.18, M.star('#FFF8EE'))}`)}, #1C1A22` },
  { id: 'leopard', name: 'Leopard', group: 'rock', tint: '#D9A05B', bg: `${tile(48, 24, [[6, 7, 10], [17, 16, -20], [28, 7, 30], [40, 16, 0], [6, 18.5, 60], [40, 5, -40], [29, 19, 15], [17, 4.5, 45]].map(([x, y, r]) => at(x, y, 0.85, M.rosette('#2B1A10', '#B9772E'), r)).join(''))}, #D9A05B` },
  { id: 'checker', name: 'Checkerboard', group: 'rock', tint: '#1C1A22', bg: checks('#1C1A22', '#FFF8EE', 0.5) },
  { id: 'pink-checker', name: 'Hot pink checks', group: 'rock', tint: '#FF3E9D', bg: checks('#FF3E9D', '#1C1A22', 0.5) },
  { id: 'picks', name: 'Guitar picks', group: 'rock', tint: '#6C3FB5', bg: `${tile(48, 24, ['#FF4D6D', '#FFE14D', '#3DDC97', '#4CC9F0'].map((c, i) => at(6 + i * 12, i % 2 ? 15 : 9, 0.5, M.pick(c), i % 2 ? 20 : -15)).join(''))}, #6C3FB5` },
  { id: 'flames', name: 'Flames', group: 'rock', tint: '#FF5A1F', bg: `${tile(16, 24, at(8, 15, 0.9, M.flame()))}, linear-gradient(#1C1A22 40%, #3A1508)` },
  { id: 'neon-stars', name: 'Neon stars', group: 'rock', tint: '#FF4FD8', bg: `${tile(36, 24, `${at(8, 9, 0.5, M.star('none', '#FF4FD8'))}${at(20, 16, 0.42, M.star('none', '#3DF5FF'))}${at(31, 8, 0.36, M.star('none', '#E4FF3D'))}`)}, #15121F` },
  { id: 'notes', name: 'Music notes', group: 'rock', tint: '#C9B6FF', bg: `${tile(36, 24, `${at(8, 11, 0.62, M.note('#3B2370'))}${at(21, 13, 0.52, M.note('#FF4F9A'))}${at(31, 9, 0.44, M.note('#3B2370'))}`)}, #C9B6FF` },
  { id: 'guitars', name: 'Rock guitars', group: 'rock', tint: '#E63946', bg: `${tile(32, 24, `${at(9, 12.5, 0.85, M.guitar('#1C1A22'), -30)}${at(24, 12.5, 0.85, M.guitar('#FFE14D'), 30)}`)}, #E63946` },

  // Misc: flowers, butterflies, sprinkles and space. Watermelon, lemons and cherries are fruit, so they're in the fruit group
  { id: 'daisies', name: 'Daisies', group: 'misc', tint: '#8CCB6A', bg: `${tile(32, 24, `${at(8, 9, 0.65, M.daisy())}${at(24, 16, 0.55, M.daisy('#FFF8EE', '#FF9F43'))}`)}, #8CCB6A` },
  { id: 'butterflies', name: 'Butterflies', group: 'misc', tint: '#BFE3FF', bg: `${tile(36, 24, `${at(9, 11, 0.7, M.butterfly('#FF8FC2', '#FFC14D'), -12)}${at(27, 13, 0.6, M.butterfly('#9B7BFF', '#5FD0C4'), 14)}`)}, #BFE3FF` },
  { id: 'watermelon', name: 'Watermelon', group: 'fruit', tint: '#FF8FA0', bg: `${tile(24, 24, at(12, 11, 0.85, M.melon()))}, ${bands(['#FFD1D8', '#FFD1D8', '#FFD1D8', '#9BD89E'])}` },
  { id: 'lemons', name: 'Lemon slices', group: 'fruit', tint: '#FFF09A', bg: `${tile(24, 24, at(12, 12, 0.85, M.lemon()))}, #8FD3B6` },
  { id: 'cherries', name: 'Cherries', group: 'fruit', tint: '#FFF8EE', bg: `${tile(24, 24, at(12, 11, 0.85, M.cherries()))}, ${checks('#FFE3E6', '#FFF8EE', 0.33)}` },
  { id: 'space', name: 'Outer space', group: 'misc', tint: '#1F2A5A', bg: `${tile(48, 24, `${at(10, 12, 0.85, M.planet('#FF9F6E', '#FFE0C2'))}${at(32, 9, 0.5, M.planet('#7FD1FF', '#C9B6FF'))}${at(24, 20, 0.16, M.star('#FFF8EE'))}${at(42, 18, 0.2, M.star('#FFE9A8'))}${at(20, 4, 0.12, M.star('#FFF8EE'))}`)}, ${dots('rgba(255,248,238,.55)', 0.025, 0.3)}, #1F2A5A` },
  { id: 'sprinkles', name: 'Rainbow sprinkles', group: 'misc', tint: '#FFE3EE', bg: `${tile(24, 24, (() => { const r = seeded('sprinkles'); return Array.from({ length: 14 }, (_, i) => at(n2(1 + r() * 22), n2(1 + r() * 22), 0.9, M.sprinkle(BRIGHT[i % BRIGHT.length], Math.round(r() * 180)))).join('') })())}, #FFE3EE` },
  fruitTape('apples', 'Apples', '#E5484D', FRUIT.apple, '#FFE3E3'),
  fruitTape('green-apples', 'Green apples', '#8BC34A', FRUIT.greenApple, '#EAF7D8'),
  fruitTape('pears', 'Pears', '#C6D96B', FRUIT.pear, '#F4F6D8'),
  fruitTape('orange-slices', 'Orange slices', '#FF8A1C', FRUIT.orange, '#FFF0DB'),
  fruitTape('lime-slices', 'Lime slices', '#6DB33F', FRUIT.lime, '#EAF7D8'),
  fruitTape('grapes', 'Grapes', '#7B4FB8', FRUIT.grapes, '#EFE7FA'),
  fruitTape('bananas', 'Bananas', '#FFE14D', FRUIT.banana, '#FFF8D6'),
  fruitTape('peaches', 'Peaches', '#FF9E7A', FRUIT.peach, '#FFE9E0'),
  fruitTape('pineapples', 'Pineapples', '#F6B73C', FRUIT.pineapple, '#FFF3CC'),
  fruitTape('kiwi-slices', 'Kiwi slices', '#8CC63F', FRUIT.kiwi, '#EEF7DA'),
  fruitTape('mangoes', 'Mangoes', '#FFC145', FRUIT.mango, '#FFF1D6'),
  fruitTape('blueberries', 'Blueberries', '#3D5A9A', FRUIT.blueberries, '#E6ECFA'),
  fruitTape('raspberries', 'Raspberries', '#E0245E', FRUIT.raspberry, '#FDE6EE'),
  fruitTape('blackberries', 'Blackberries', '#4A3D57', FRUIT.blackberry, '#ECE6F0'),
  fruitTape('plums', 'Plums', '#6B2F7E', FRUIT.plum, '#F1E6F4'),
  fruitTape('pomegranates', 'Pomegranates', '#D7263D', FRUIT.pomegranate, '#FCE4E4'),
  fruitTape('avocados', 'Avocados', '#3E6B2A', FRUIT.avocado, '#EEF5DA'),
  fruitTape('coconuts', 'Coconuts', '#8B5A2B', FRUIT.coconut, '#F4EDE2'),
  fruitTape('figs', 'Figs', '#8A5A4A', FRUIT.fig, '#F5ECE6'),
  fruitTape('dragon-fruit', 'Dragon fruit', '#E8488A', FRUIT.dragon, '#FDE3EF'),

  // Her favourites: nods, never names or copies (see the note at the top)
  { id: 'kitty-kingdom', name: 'Kitty Kingdom', group: 'faves', tint: '#9B6BD6', bg: `${tile(36, 24, `${at(9, 13, 0.8, M.catEars('#5B2F91', '#FFB3E6'))}${at(27, 12, 0.32, M.pixelHeart('#FF6FB5'))}`)}, ${stripes(['#B48CE8', '#A57CDE'], 0.18, 90)}`, line: 'Purple, cat ears, and a whole lot of heart.' },
  { id: 'pixel-meadow', name: 'Pixel meadow', group: 'faves', tint: '#6DBE45', bg: `${tile(24, 24, (() => { const r = seeded('meadow'); let s = ''; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const top = y < 3 ? ['#5BAE3C', '#6DBE45', '#7FCC52'] : ['#8B5A2B', '#7A4E24', '#986536']; s += `<rect x='${x * 3}' y='${y * 3}' width='3.05' height='3.05' fill='${top[Math.floor(r() * 3)]}'/>` } return s + `<rect x='6' y='3' width='3' height='3' fill='#FFE14D'/><rect x='18' y='0' width='3' height='3' fill='#FF6FB5'/>` })())}`, line: 'Built one block at a time.' },
  { id: 'cat-eye', name: 'Cat-eye pop', group: 'faves', tint: '#FF3E9D', bg: `${glitter('cat-eye', ['#FFFFFF', '#FFD1EA'], { w: 30, n: 10, sparks: 2 })}, ${tile(30, 24, `${at(15, 12, 0.95, M.flick('#1C1A22'))}${at(4, 5, 0.22, M.sparkle('#FFF8EE'))}${at(26, 19, 0.18, M.sparkle('#FFF8EE'))}`)}, linear-gradient(100deg, #FF3E9D, #FF7AC0)`, glitter: true, line: 'A perfect flick, and a little sparkle.' },
  { id: 'six-on-stage', name: 'Six on stage', group: 'faves', tint: '#1C1A22', bg: `${tile(72, 24, ['#FF4FA3', '#FFE14D', '#3DF5FF', '#B57CFF', '#3DDC97', '#FF9F43'].map((c, i) => at(6 + i * 12, 12, 0.48, M.star(c))).join(''))}, linear-gradient(100deg, transparent 20%, rgba(255,248,238,.16) 30%, transparent 40%, transparent 60%, rgba(255,248,238,.16) 70%, transparent 80%), #1C1A22`, line: 'Lights up: six, together.' },
  { id: 'agent', name: 'Agent of oddities', group: 'faves', tint: '#1C1A22', bg: `${tile(48, 24, `${at(10, 12, 0.72, M.magnifier('#FFF8EE'))}${at(26, 12, 0.62, M.query('#E63946'))}${at(40, 12, 0.36, M.gem('#FFF8EE', '#1C1A22'))}`)}, linear-gradient(180deg, #1C1A22 0 42%, #E63946 42% 58%, #1C1A22 58%)`, line: 'For agents who handle anything odd.' },
  { id: 'gadget-lab', name: 'Gadget lab', group: 'faves', tint: '#E63946', bg: `${tile(48, 24, `${at(10, 12.5, 0.8, M.gadget('#1C1A22', '#7FE3FF', '#E63946'))}${at(30, 12.5, 0.8, M.gadget('#E63946', '#FFE14D', '#1C1A22'), 8)}<text x='42' y='16' font-family='monospace' font-weight='700' font-size='11' fill='#1C1A22'>?</text>`)}, ${checks('#FFF8EE', '#F0E6D6', 0.5)}`, line: 'Every gadget, field tested.' },
  { id: 'our-pets', name: 'Our pets', group: 'faves', tint: '#7FB7C9', bg: `${tile(60, 24, at(10, 12, 0.19, catHead('kona')) + at(30, 12, 0.19, catHead('portia')) + at(50, 12, 0.19, catHead('goldie')))}, #7FB7C9`, line: 'Kona, Portia and Goldie, peeking over the wall.' },
]

/** The sparks that twinkle over a glitter tape (src/ui/tape.css fades them in and out: opacity only). */
export const TWINKLE = svg(24, 24, glitterBody('twinkle', ['#FFFFFF'], { n: 5, sparks: 4 }))

const BY_ID = new Map(TAPES.map((t) => [t.id, t]))
/** The tape with this id, or null. */
export const tapeById = (id) => BY_ID.get(id) || null

/** The tape a drawing hangs with: the one she picked if it's one we have, else one of the first four from its id. */
export function tapeFor(drawing) {
  const picked = drawing && drawing.tape ? tapeById(drawing.tape) : null
  return picked || TAPES[tapeOf(drawing ? drawing.id : '')]
}

/** True for an id the database will keep: lower-case words and hyphens, as the migration checks. */
export const validTapeId = (id) => typeof id === 'string' && /^[a-z0-9-]{1,40}$/.test(id) && BY_ID.has(id)

/** "Surprise me": any tape but the one it has, from a number in [0, 1). */
export function surpriseTape(currentId, r = Math.random()) {
  const others = TAPES.filter((t) => t.id !== currentId)
  return others[Math.min(others.length - 1, Math.floor(r * others.length))]
}

/** The tapes in a group, in the catalogue's order. */
export const tapesIn = (group) => TAPES.filter((t) => t.group === group)
