import SunCalc from 'suncalc'
import { phaseOf, skyGradient, SKIES, moonLitPath } from '../../lib/sky.js'
import { reducedMotion } from '../../lib/motion.js'
import * as S from '../../lib/scenes.js'

// Each place's skyline in its own sky right now: the colour follows the sun
// there, windows light up after dark, clouds come with cloudy weather.
// Shapes from src/lib/scenes.js; generic silhouettes, no one's artwork.

const TONES = {
  night: { far: '#2E2A4C', mid: '#211E3A', near: '#120F24', water: '#1C2444', snow: '#9C98BE', lit: '#FFD58A' },
  dawn: { far: '#6E6693', mid: '#4C446C', near: '#2A2342', water: '#5D5D8C', snow: '#F1DCE8', lit: '#FFD58A' },
  morning: { far: '#97A6C6', mid: '#69779C', near: '#3A4364', water: '#87A7D0', snow: '#FFFFFF', lit: null },
  day: { far: '#90AACB', mid: '#61799C', near: '#34435F', water: '#5E94C7', snow: '#FFFFFF', lit: null },
  golden: { far: '#B88E86', mid: '#80586A', near: '#3D2A3C', water: '#C2967A', snow: '#FFF0DF', lit: null },
  sunset: { far: '#B47680', mid: '#7A4760', near: '#38233A', water: '#C9806C', snow: '#FBDCCB', lit: '#FFD58A' },
  dusk: { far: '#6F5279', mid: '#463354', near: '#241A30', water: '#4E4170', snow: '#E6C6D0', lit: '#FFD58A' },
}
const LIGHT_SHAPES = { sail: { day: '#F7F0E6', dark: '#C9C2D8' } }

/** The month there, 1-12, for snow and blossoms. */
const monthAt = (tz, now) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric' }).format(now)
const minuteAt = (tz, now) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, minute: 'numeric' }).format(now)
const hourAt = (tz, now) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
const snowy = (m) => m === 12 || m <= 3

export function placeSky(place, now) {
  const t = SunCalc.getTimes(now, place.lat, place.lng)
  const phase = phaseOf(now, t)
  return { phase, dark: SKIES[phase].dark, background: skyGradient(phase) }
}

export default function Scene({ place, now, pic, className = '' }) {
  const { phase, background } = placeSky(place, now)
  const tone = TONES[phase], lit = tone.lit, night = phase === 'night' || phase === 'dusk'
  const still = reducedMotion()
  const ctx = { tone, lit, night, still, month: monthAt(place.tz, now), hour: hourAt(place.tz, now), minute: minuteAt(place.tz, now), sail: phase === 'night' || phase === 'dusk' ? LIGHT_SHAPES.sail.dark : LIGHT_SHAPES.sail.day }
  const draw = SCENES[place.scene] || SCENES.home
  const sun = SunCalc.getPosition(now, place.lat, place.lng), moon = SunCalc.getMoonPosition(now, place.lat, place.lng)
  const alt = (sun.altitude * 180) / Math.PI, mAlt = (moon.altitude * 180) / Math.PI
  const skyX = (az) => 200 + (az / Math.PI) * 300
  const cloudy = ['cloudy', 'rain', 'drizzle', 'snow', 'thunder', 'fog'].includes(pic), partly = pic === 'partly' || pic === 'night-partly'
  return (
    <div className={'scene ' + className} style={{ background }}>
      <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        {(phase === 'night' || phase === 'dusk') && S.stars(place.slug.length * 31, 40).map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#FFF" opacity={phase === 'night' ? 0.85 : 0.45} className={still || i % 3 ? '' : 'twinkle'} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />)}
        {alt > -1 && (
          <g transform={`translate(${skyX(sun.azimuth).toFixed(1)} ${(130 - Math.min(alt, 62) * 1.55).toFixed(1)})`}>
            <circle r="16" fill="#FFE29A" opacity=".28" />
            <circle r="8" fill={alt < 8 ? '#FFB36A' : '#FFE07A'} />
          </g>
        )}
        {alt <= -1 && mAlt > 0 && (
          <g transform={`translate(${skyX(moon.azimuth).toFixed(1)} ${(130 - Math.min(mAlt, 62) * 1.55).toFixed(1)})`}>
            <circle r="7" fill="#FFF" opacity=".12" />
            <path d={moonLitPath(SunCalc.getMoonIllumination(now).fraction, 6)} fill="#F6EED2" />
          </g>
        )}
        {(cloudy || partly) && (
          <g className={still ? '' : 'drift'} fill={night ? '#3A3556' : phase === 'day' || phase === 'morning' ? '#FFFFFF' : '#F5C9B5'} opacity={cloudy ? 0.92 : 0.7}>
            <path d={S.cloud(60, 34, 1.3) + S.cloud(250, 22, 1) + (cloudy ? S.cloud(380, 40, 1.4) + S.cloud(-60, 26, 1.1) + S.cloud(150, 52, 0.9) : '')} />
          </g>
        )}
        {cloudy && <rect x="-160" y="0" width="720" height="150" fill={night ? '#000' : '#6F7686'} opacity={night ? 0.15 : 0.18} />}
        {draw(ctx)}
      </svg>
    </div>
  )
}

const range = (seed, base, amp, fill, snow, opts = {}) => {
  const pts = S.ridgePoints({ seed, base, amp, ...opts })
  return <g key={'r' + seed}><path d={S.rangePath(pts)} fill={fill} />{snow && <path d={S.snowCaps(pts, base - amp * 0.72)} fill={snow} />}</g>
}
const P = (d, fill, key, extra = {}) => <path key={key} d={d} fill={fill} {...extra} />

/** Mountains behind the valley: the San Gabriels, white-topped in winter. */
const valley = (c, seed = 3) => [range(seed, 104, 44, c.tone.far, snowy(c.month) && c.tone.snow), range(seed + 10, 128, 18, c.tone.mid, null, { jag: 1.2 })]

const SCENES = {
  home: (c) => [
    ...valley(c),
    P([-130, -118, -106, -94, -82].map((x, i) => S.eucalyptus(x, 58 + (i % 2) * 8)).join(''), c.tone.near, 'e'),
    P(S.house(150, 46, 18), c.tone.near, 'h'),
    c.lit && P('M162 140h7v5h-7zM176 140h7v5h-7z', c.lit, 'hw'),
    P(S.palm(118, 66, -5) + S.palm(232, 78, 6) + S.palm(250, 60, 3), c.tone.near, 'p'),
    P(S.oak(330, 13) + S.oak(470, 15), c.tone.near, 'o'),
  ],
  kordyak: (c) => [
    ...valley(c, 5),
    P(S.school(140) + S.swingSet(270), c.tone.near, 's'),
    P(S.flag(140), '#C8553D', 'f'),
    c.lit && P('M150 132h8v4h-8zM166 132h8v4h-8zM196 124h8v4h-8zM218 132h8v4h-8zM234 132h8v4h-8z', c.lit, 'w'),
    P(S.oak(80, 14) + S.palm(340, 70, 4) + S.oak(-40, 16) + S.oak(450, 13), c.tone.near, 't'),
  ],
  ruble: (c) => [
    ...valley(c, 9),
    P(S.school(120) + S.bleachers(250) + S.bleachers(284), c.tone.near, 's'),
    P(S.flag(120), '#4A7FD6', 'f'),
    c.lit && P('M130 132h8v4h-8zM146 132h8v4h-8zM176 124h8v4h-8zM198 132h8v4h-8zM214 132h8v4h-8z', c.lit, 'w'),
    P(S.palm(60, 74, -4) + S.palm(80, 62, 3) + S.pine(360, 44) + S.pine(-30, 50), c.tone.near, 't'),
  ],
  soar: (c) => {
    const pts = S.ridgePoints({ seed: 21, base: 100, amp: 46 })
    return [
      <path key="m" d={S.rangePath(pts)} fill={c.tone.far} />,
      snowy(c.month) && <path key="sn" d={S.snowCaps(pts, 100 - 46 * 0.72)} fill={c.tone.snow} />,
      P(S.arrowhead(210, 76), c.night ? '#5B5478' : '#D9C7A6', 'a'),
      range(31, 128, 16, c.tone.mid, null, { jag: 1 }),
      P(S.school(150), c.tone.near, 's'),
      P(S.flag(150), '#5FA85A', 'f'),
      c.lit && P('M160 132h8v4h-8zM176 132h8v4h-8zM206 124h8v4h-8zM228 132h8v4h-8zM244 132h8v4h-8z', c.lit, 'w'),
      P(S.palm(100, 70, -3) + S.palm(300, 64, 4) + S.oak(-50, 15) + S.oak(420, 14), c.tone.near, 't'),
    ]
  },
  parish: (c) => [
    ...valley(c, 13),
    P(S.mission(180), c.tone.near, 'c'),
    P(S.missionDoor(180) + S.missionArches(180) + S.bellWindow(180), c.lit || c.tone.mid, 'd'),
    P(S.palm(110, 76, -6) + S.palm(270, 70, 5) + S.palm(290, 56, 2) + S.oak(-40, 14) + S.oak(420, 15), c.tone.near, 'p'),
  ],
  redlands: (c) => [
    range(41, 98, 52, c.tone.far, snowy(c.month) ? c.tone.snow : c.night ? null : '#E9E2D6'),
    range(43, 130, 14, c.tone.mid, null, { jag: 1 }),
    P([...Array(14)].map((_, i) => S.roundTree(-150 + i * 17, 6.5)).join('') + [...Array(10)].map((_, i) => S.roundTree(330 + i * 17, 6.5)).join(''), c.tone.near, 'g'),
    !c.night && P([...Array(14)].map((_, i) => `M${-152 + i * 17} 138h1.6v1.6h-1.6zM${-147 + i * 17} 141h1.6v1.6h-1.6z`).join('') + [...Array(10)].map((_, i) => `M${328 + i * 17} 138h1.6v1.6h-1.6zM${333 + i * 17} 141h1.6v1.6h-1.6z`).join(''), '#F0912E', 'fr'),
    P(S.victorian(190), c.tone.near, 'v'),
    c.lit && P('M198 132h4v5h-4zM210 132h4v5h-4zM182 120h3v4h-3z', c.lit, 'w'),
    P(S.palm(150, 74, -3) + S.palm(286, 80, 3) + S.palm(306, 72, 4), c.tone.near, 'p'),
  ],
  claremont: (c) => [
    range(51, 86, 54, c.tone.far, (snowy(c.month) || c.month === 4 || c.month === 11) && c.tone.snow, { waves: [0.011, 0.03, 0.08] }),
    range(53, 130, 12, c.tone.mid, null, { jag: 1 }),
    P(S.shops(120, 6) + S.clockTower(250, 52), c.tone.near, 'b'),
    P('M246 108a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z', c.lit || '#EADFC8', 'cl'),
    c.lit && P('M124 138h10v6h-10zM158 136h10v6h-10zM192 138h10v6h-10z', c.lit, 'w'),
    P(S.oak(80, 16) + S.oak(300, 18) + S.oak(-40, 15) + S.oak(420, 17) + S.oak(520, 14), c.tone.near, 't'),
  ],
  'san-dimas': (c) => [
    range(61, 92, 40, c.tone.far, null, { waves: [0.012, 0.03, 0.07], jag: 1 }),
    range(63, 118, 22, c.tone.mid, null, { waves: [0.015, 0.035, 0.06], jag: 0.8 }),
    range(65, 138, 10, c.tone.near, null, { waves: [0.02, 0.05, 0.08], jag: 0.5 }),
    P(S.oak(40, 15) + S.oak(130, 19) + S.oak(250, 14) + S.oak(330, 17) + S.oak(-90, 16) + S.oak(470, 15), c.tone.near, 'o'),
  ],
  'big-bear': (c) => [
    range(71, 80, 58, c.tone.far, c.month <= 4 || c.month >= 11 ? c.tone.snow : null),
    P(S.water(124), c.tone.water, 'w'),
    P(S.waves(71, 124), c.night ? '#3A4470' : 'rgba(255,255,255,.45)', 'wv'),
    P([-150, -132, -110, -95, -70, 330, 352, 372, 400, 430, 470, 500, 530].map((x, i) => S.pine(x, 46 + (i % 3) * 12)).join(''), c.tone.near, 'p'),
    P(S.cabin(40), c.tone.near, 'c'),
    c.lit && P('M47 138h6v5h-6z', c.lit, 'cw'),
  ],
  anaheim: (c) => {
    const [fx, fy] = S.ferrisCentre(310, 30)
    return [
      range(81, 116, 18, c.tone.far, null, { jag: 1 }),
      P(S.crag(70), c.tone.mid, 'cr'),
      P(S.cragSnow(70), c.tone.snow, 'cs'),
      <g key="fw" className={c.still ? '' : 'spin'} style={{ transformOrigin: `${fx}px ${fy}px` }}>
        <path d={S.ferrisWheel(310, 30)} fill="none" stroke={c.tone.near} strokeWidth="1.2" />
      </g>,
      c.lit && <g key="fl" className={c.still ? '' : 'spin'} style={{ transformOrigin: `${fx}px ${fy}px` }}>{[...Array(12)].map((_, i) => { const a = (i * Math.PI) / 6; return <circle key={i} cx={fx + Math.cos(a) * 30} cy={fy + Math.sin(a) * 30} r="1.6" fill={['#FF7AC2', '#FFD36A', '#7AE0FF'][i % 3]} /> })}</g>,
      P(S.ferrisFrame(310, 30), c.tone.near, 'ff'),
      P(S.monorailBeam(116, -160, 560), c.tone.near, 'mb'),
      <g key="mt" className={c.still ? '' : 'glide'} style={{ transform: c.still ? 'translateX(360px)' : undefined }}>
        <path d={S.monorailTrain(116)} fill={c.night ? '#2C2448' : '#F2EEE8'} stroke={c.tone.near} strokeWidth=".8" />
        <path d={S.monorailWindows(116)} fill={c.lit || '#4D5F86'} />
        <path d="M0 113h76v1.4H0z" fill={['#E0457B', '#3A86C8', '#F2B33D'][c.month % 3]} />
      </g>,
      P(S.castle(190), c.tone.near, 'ca'),
      P(S.castleFlags(190), c.night ? '#E9C46A' : '#E07A9E', 'fl2'),
      P(S.castleGate(190), c.lit || c.tone.mid, 'g'),
      c.lit && P('M188 104h4v5h-4zM174 118h3v4h-3zM202 116h3v4h-3zM154 126h3v3h-3zM224 128h3v3h-3z', c.lit, 'cw'),
      P(S.palm(-20, 70, -4) + S.palm(0, 58, 3) + S.palm(420, 74, 5) + S.palm(440, 62, -2) + S.palm(120, 50, -3), c.tone.near, 'p'),
      c.night && (c.hour === 20 || c.hour === 21) && <Fireworks key="fx" still={c.still} />,
    ]
  },
  lancaster: (c) => {
    const bloom = c.month >= 3 && c.month <= 5 // the poppies, most springs
    return [
      range(161, 112, 30, c.tone.far, snowy(c.month) && c.tone.snow, { jag: 1.4 }),
      ...[-130, -96, -62, 420, 452, 486, 520].map((x, i) => (
        <g key={'wt' + i}>
          <path d={S.turbineTower(x, 30)} fill={c.tone.mid} />
          <path d={S.turbineBlades(x, 120, 9)} fill={c.tone.mid} className={c.still ? '' : 'spin'} style={{ transformOrigin: `${x}px 120px`, animationDuration: `${7 + i}s` }} />
        </g>
      )),
      P('M-160 150V136Q-60 132 40 135T240 134T560 136V150Z', c.night ? '#2A2340' : '#D9B98A', 'desert'),
      bloom && !c.night && P(Array.from({ length: 70 }, (_, i) => { const r = S.seeded(i + 3), x = -150 + r() * 700, y = 137 + r() * 12; return `M${x.toFixed(1)} ${y.toFixed(1)}a1.3 1.1 0 1 0 2.6 0a1.3 1.1 0 1 0-2.6 0Z` }).join(''), '#F2741F', 'pop'),
      P(S.joshuaTree(60, 70, 4) + S.joshuaTree(150, 52, 9) + S.joshuaTree(290, 78, 13) + S.joshuaTree(360, 46, 21) + S.joshuaTree(-60, 58, 5) + S.joshuaTree(470, 64, 31), c.tone.near, 'jt'),
    ]
  },
  'long-beach': (c) => [
    P(S.skyline(91, 260, 560, 14, 46), c.tone.far, 'sk'),
    c.lit && P(S.windows(91, 262, 560, 6, 44), c.lit, 'skw'),
    P(S.water(132), c.tone.water, 'w'),
    P(S.waves(93, 132), c.night ? '#2E3866' : 'rgba(255,255,255,.4)', 'wv'),
    P(S.crane(-70, 54) + S.crane(10, 60) + S.crane(70, 56), c.tone.mid, 'cr'),
    P(S.liner(215, 134), c.tone.near, 'l'),
    P(S.funnels(215, 134), c.night ? '#7A2A2A' : '#C8402E', 'fn'),
    c.lit && P(S.portholes(215, 134), c.lit, 'ph'),
    P(S.palm(330, 58, 3) + S.palm(350, 70, -4) + S.palm(480, 64, 2), c.tone.near, 'p'),
  ],
  'san-diego': (c) => [
    P(S.skyline(101, 200, 420, 12, 50), c.tone.far, 'sk'),
    c.lit && P(S.windows(101, 202, 420, 6, 48), c.lit, 'skw'),
    range(103, 136, 10, c.tone.mid, null, { x0: -160, x1: 120, jag: 0.6 }),
    P(S.lighthouse(24), c.tone.near, 'lh'),
    c.lit && <path key="beam" d="M24 108L-150 92V104Z" fill="#FFE6A8" opacity=".25" />,
    P(S.water(138), c.tone.water, 'w'),
    P(S.waves(105, 138), c.night ? '#2E3866' : 'rgba(255,255,255,.45)', 'wv'),
    ...[[90, 1, 141], [160, 0.8, 143], [300, 1.1, 142], [470, 0.9, 141]].map(([x, s, y], i) => <g key={'b' + i}><path d={S.hull(x, s, y)} fill={c.tone.near} /><path d={S.sails(x, s, y)} fill={c.sail} /></g>),
    P(S.palm(400, 60, 3) + S.palm(520, 70, -3), c.tone.near, 'p'),
  ],
  kona: (c) => [
    P(S.volcano(320, 520, 62), c.tone.far, 'v1'),
    P(S.volcano(40, 300, 40), c.tone.mid, 'v2'),
    P(S.water(132), c.tone.water, 'w'),
    P(S.waves(111, 132), c.night ? '#2E3866' : 'rgba(255,255,255,.6)', 'wv'),
    P('M-160 146Q-60 140 40 145T240 144T560 146V150H-160Z', c.night ? '#3B4470' : '#F5EEDC', 'surf'),
    P(S.canoe(150, 138), c.tone.near, 'cn'),
    P(S.palm(300, 82, 8) + S.palm(320, 66, -4) + S.palm(-60, 74, -6) + S.palm(480, 70, 5), c.tone.near, 'p'),
  ],
  washington: (c) => {
    const blossom = c.month === 3 || c.month === 4
    const glow = c.night ? '#EDE6D2' : c.tone.near
    return [
      P(S.skyline(121, -160, 560, 6, 16), c.tone.far, 'sk'),
      P(S.capitol(130), glow, 'cap'),
      P(S.obelisk(300, 110), glow, 'ob'),
      c.night && P('M298.6 47h1.2v1.6h-1.2zM300.4 47h1.2v1.6h-1.2z', '#FF4D4D', 'red'),
      P([-120, -100, -80, 220, 240, 380, 400, 420, 520].map((x) => S.roundTree(x, 9)).join(''), blossom && !c.night ? '#F0A9C4' : c.tone.near, 't'),
    ]
  },
  'new-york': (c) => [
    P(S.skyline(131, -160, 560, 20, 66), c.tone.far, 'sk1'),
    P(S.skyline(133, -120, 520, 12, 40) + S.spireTower(200), c.tone.mid, 'sk2'),
    c.lit && P(S.windows(133, -120, 520, 6, 64, 0.5), c.lit, 'w'),
    c.night && P('M199.3 92h1.4v-30h-1.4z', '#BFD7FF', 'spire'),
    P(S.water(140), c.tone.water, 'wt'),
    P(S.waves(135, 140), c.night ? '#2E3866' : 'rgba(255,255,255,.35)', 'wv'),
  ],
  paris: (c) => {
    // Lit gold from nightfall to a quarter to midnight, sparkling for five minutes on the hour
    const gold = c.night && c.hour >= 17 && (c.hour < 23 || c.minute < 45), sparkle = gold && c.minute < 5
    return [
      range(141, 132, 8, c.tone.far, null, { jag: 0.5 }),
      <Eiffel key="et" x={250} h={116} colour={gold ? '#E9B04A' : c.tone.mid} />,
      sparkle && <g key="sp">{S.stars(7, 30).map(([x, y], i) => <circle key={i} cx={250 + ((x % 40) - 20) * (y / 80)} cy={40 + y * 1.3} r=".9" fill="#FFF" className={c.still ? '' : 'twinkle'} style={{ animationDelay: `${(i % 5) * 0.2}s` }} />)}</g>,
      P(S.rooftops(143, -160, 560), c.tone.near, 'rt'),
      c.lit && P(S.windows(143, -160, 560, 4, 24, 0.5), c.lit, 'w'),
    ]
  },
  beijing: (c) => [
    range(151, 108, 34, c.tone.far, c.month <= 2 || c.month === 12 ? c.tone.snow : null, { jag: 1.5 }),
    P(S.templeOfHeaven(200), c.tone.near, 'th'),
    P(S.finial(200), '#E9B04A', 'fi'),
    c.lit && P('M195 130h3v4h-3zM202 130h3v4h-3z', c.lit, 'w'),
    P([60, 80, 100, 300, 320, 340, -60, -40, 460, 480].map((x, i) => S.pine(x, 30 + (i % 3) * 8)).join(''), c.tone.near, 'p'),
    P('M-160 150V140H560V150Z', c.tone.near, 'wall'),
  ],
}

/** The Eiffel Tower as an open lattice: its platforms filled, its legs and bracing drawn in fine lines. */
function Eiffel({ x, h, colour }) {
  const { solid, lines } = S.eiffel(x, h)
  return (
    <g>
      <path d={lines} fill="none" stroke={colour} strokeWidth=".75" strokeLinejoin="round" strokeLinecap="round" />
      <path d={solid} fill={colour} />
    </g>
  )
}

/** Fireworks: a big round burst with two smaller ones rising out of it, up and to either side, then a few more. */
function Fireworks({ still }) {
  const shells = [
    ...S.burstTrio(200, 50, 19).map((b, i) => ({ ...b, colour: ['#FFD36A', '#FF7AC2', '#7AE0FF'][i] })),
    { x: 92, y: 46, r: 11, delay: 1.9, colour: '#B48CFF' }, { x: 318, y: 40, r: 12, delay: 2.6, colour: '#FFD36A' },
  ]
  return (
    <g>
      {shells.map((b, i) => {
        const n = Math.round(b.r * 1.3)
        return (
          <g key={i} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}>
            <g className={still ? '' : 'burst'} style={{ animationDelay: `${b.delay}s`, opacity: still ? 0.6 : undefined }}>
              {Array.from({ length: n }, (_, k) => {
                const a = (k * 2 * Math.PI) / n
                return <line key={k} x1={Math.cos(a) * b.r * 0.32} y1={Math.sin(a) * b.r * 0.32} x2={Math.cos(a) * b.r} y2={Math.sin(a) * b.r} stroke={b.colour} strokeWidth="1.2" strokeLinecap="round" />
              })}
              {Array.from({ length: n }, (_, k) => {
                const a = ((k + 0.5) * 2 * Math.PI) / n
                return <circle key={'s' + k} cx={Math.cos(a) * b.r * 1.08} cy={Math.sin(a) * b.r * 1.08} r=".7" fill="#FFF" />
              })}
            </g>
          </g>
        )
      })}
    </g>
  )
}
