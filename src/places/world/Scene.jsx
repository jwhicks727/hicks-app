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

/** `mini` crops the skyline to fit a small tile: the ground and the landmark, the sky trimmed. */
export default function Scene({ place, now, pic, className = '', mini = false }) {
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
    <div className={'scene ' + (mini ? 'mini ' : '') + className} style={{ background }}>
      <svg viewBox="0 0 400 150" preserveAspectRatio={mini ? 'xMidYMax slice' : 'xMidYMax meet'} aria-hidden="true">
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

// ---- Movement: every place has something that moves, on its own clock ----------
// Transforms and opacity only; each piece is still under Reduce Motion (`c.still`, and world.css).
const mv = (c, cls, style = {}) => (c.still ? {} : { className: cls, style })
/** Trees and palms, each its own path, each swaying on its own beat. [x, size, lean] per plant. */
const plants = (c, fn, list, fill, key, deg = 1.4) => list.map(([x, a, b], i) => (
  <path key={key + i} d={S[fn](x, a, b)} fill={fill} {...mv(c, 'sway', { animationDuration: `${4.2 + (i % 4) * 0.9}s`, animationDelay: `${-(i % 5) * 0.8}s`, '--deg': `${deg}deg` })} />
))
/** A flag on its pole, rippling. */
const waveFlag = (c, x, fill, key) => <path key={key} d={S.flag(x)} fill={fill} {...mv(c, 'wave')} />
/** A bird crossing the sky, wings beating: y is its height, dur how long a crossing takes. */
const bird = (c, key, y, dur, delay = 0, big = false) => (
  <g key={key} transform={`translate(0 ${y})`}>
    <g className={c.still ? '' : 'glide'} style={c.still ? { transform: `translateX(${60 + delay * 12}px)` } : { animationDuration: `${dur}s`, animationDelay: `${-delay}s` }}>
      <path d={big ? 'M-9 0Q-4.5 -5 0 0Q4.5 -5 9 0' : 'M-5 0Q-2.5 -3 0 0Q2.5 -3 5 0'} fill="none" stroke={c.night ? '#BFB6D9' : '#3A3350'} strokeWidth={big ? 1.6 : 1.2} strokeLinecap="round" {...mv(c, 'flap')} />
    </g>
  </g>
)
/** A bird circling over one spot (a hawk). */
const hawk = (c, key, cx, cy, r, dur) => !c.night && (
  <g key={key} {...mv(c, 'spin', { transformOrigin: `${cx}px ${cy}px`, animationDuration: `${dur}s` })}>
    {/* Turned back as the ring turns, so the bird always flies right way up */}
    <g transform={`translate(${cx + r} ${cy})`}>
      <g {...mv(c, 'unspin', { animationDuration: `${dur}s` })}>
        <path d="M-6 0Q-3 -4 0 0Q3 -4 6 0" fill="none" stroke="#3A3350" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  </g>
)
/** Smoke or steam: puffs lifting off and thinning out, from [x, y]. */
const smoke = (c, key, x, y, n = 3, colour = '#FFFFFF') => c.still ? null : (
  <g key={key}>{Array.from({ length: n }, (_, i) => <circle key={i} cx={x} cy={y} r={2.2} fill={colour} className="rise" style={{ animationDelay: `${-i * (5 / n)}s` }} />)}</g>
)
/** Water: a slow slide to one side and back. */
const sea = (c, d, fill, key, dur = 9) => <path key={key} d={d} fill={fill} {...mv(c, 'slide', { animationDuration: `${dur}s` })} />

const SCENES = {
  home: (c) => [
    ...valley(c),
    ...plants(c, 'eucalyptus', [-130, -118, -106, -94, -82].map((x, i) => [x, 58 + (i % 2) * 8]), c.tone.near, 'e', 1.1),
    P(S.house(150, 46, 18), c.tone.near, 'h'),
    c.lit && P('M162 140h7v5h-7zM176 140h7v5h-7z', c.lit, 'hw'),
    ...plants(c, 'palm', [[118, 66, -5], [232, 78, 6], [250, 60, 3]], c.tone.near, 'p'),
    ...plants(c, 'oak', [[330, 13], [470, 15]], c.tone.near, 'o', 0.8),
    bird(c, 'b1', 26, 34, 6), bird(c, 'b2', 40, 44, 22),
    smoke(c, 'sm', 163, 106, 3, c.night ? '#8A84A8' : '#F4EFE8'),
  ],
  kordyak: (c) => [
    ...valley(c, 5),
    P(S.school(140) + S.swingSet(270), c.tone.near, 's'),
    waveFlag(c, 140, '#C8553D', 'f'),
    <g key="sw" {...mv(c, 'pend', { animationDuration: '2.6s' })}><path d="M286 129V142M296 129V142" stroke={c.tone.near} strokeWidth=".9" /><path d="M283 142H299V143.6H283Z" fill={c.tone.near} /></g>,
    c.lit && P('M150 132h8v4h-8zM166 132h8v4h-8zM196 124h8v4h-8zM218 132h8v4h-8zM234 132h8v4h-8z', c.lit, 'w'),
    ...plants(c, 'oak', [[80, 14], [-40, 16], [450, 13]], c.tone.near, 't', 0.8), ...plants(c, 'palm', [[340, 70, 4]], c.tone.near, 'tp'),
    bird(c, 'b1', 30, 38, 4),
  ],
  ruble: (c) => [
    ...valley(c, 9),
    P(S.school(120) + S.bleachers(250) + S.bleachers(284), c.tone.near, 's'),
    waveFlag(c, 120, '#4A7FD6', 'f'),
    <circle key="ball" cx="214" cy="146" r="2.6" fill={c.night ? '#CFC8E6' : '#FFFFFF'} stroke={c.tone.near} strokeWidth=".8" {...mv(c, 'bounce')} />,
    c.lit && P('M130 132h8v4h-8zM146 132h8v4h-8zM176 124h8v4h-8zM198 132h8v4h-8zM214 132h8v4h-8z', c.lit, 'w'),
    ...plants(c, 'palm', [[60, 74, -4], [80, 62, 3]], c.tone.near, 'tp'), ...plants(c, 'pine', [[360, 44], [-30, 50]], c.tone.near, 'tn', 0.9),
    bird(c, 'b1', 34, 40, 10),
  ],
  soar: (c) => {
    const pts = S.ridgePoints({ seed: 21, base: 100, amp: 46 })
    return [
      <path key="m" d={S.rangePath(pts)} fill={c.tone.far} />,
      snowy(c.month) && <path key="sn" d={S.snowCaps(pts, 100 - 46 * 0.72)} fill={c.tone.snow} />,
      P(S.arrowhead(210, 76), c.night ? '#5B5478' : '#D9C7A6', 'a'),
      range(31, 128, 16, c.tone.mid, null, { jag: 1 }),
      P(S.school(150), c.tone.near, 's'),
      waveFlag(c, 150, '#5FA85A', 'f'),
      c.lit && P('M160 132h8v4h-8zM176 132h8v4h-8zM206 124h8v4h-8zM228 132h8v4h-8zM244 132h8v4h-8z', c.lit, 'w'),
      ...plants(c, 'palm', [[100, 70, -3], [300, 64, 4]], c.tone.near, 'tp'), ...plants(c, 'oak', [[-50, 15], [420, 14]], c.tone.near, 'to', 0.8),
      hawk(c, 'hk', 290, 44, 26, 22),
    ]
  },
  parish: (c) => [
    ...valley(c, 13),
    P(S.mission(180), c.tone.near, 'c'),
    P(S.missionDoor(180) + S.missionArches(180) + S.bellWindow(180), c.lit || c.tone.mid, 'd'),
    <path key="bell" d="M232.6 100Q235 93.4 237.4 100Z" fill={c.night ? '#E9C46A' : '#C9961A'} {...mv(c, 'pend', { animationDuration: '2.2s' })} />,
    ...plants(c, 'palm', [[110, 76, -6], [270, 70, 5], [290, 56, 2]], c.tone.near, 'p'), ...plants(c, 'oak', [[-40, 14], [420, 15]], c.tone.near, 'o', 0.8),
    bird(c, 'd1', 46, 30, 3), bird(c, 'd2', 54, 30, 5),
  ],
  redlands: (c) => [
    range(41, 98, 52, c.tone.far, snowy(c.month) ? c.tone.snow : c.night ? null : '#E9E2D6'),
    range(43, 130, 14, c.tone.mid, null, { jag: 1 }),
    P([...Array(14)].map((_, i) => S.roundTree(-150 + i * 17, 6.5)).join('') + [...Array(10)].map((_, i) => S.roundTree(330 + i * 17, 6.5)).join(''), c.tone.near, 'g'),
    !c.night && P([...Array(14)].map((_, i) => `M${-152 + i * 17} 138h1.6v1.6h-1.6zM${-147 + i * 17} 141h1.6v1.6h-1.6z`).join('') + [...Array(10)].map((_, i) => `M${328 + i * 17} 138h1.6v1.6h-1.6zM${333 + i * 17} 141h1.6v1.6h-1.6z`).join(''), '#F0912E', 'fr'),
    <g key="bal" {...mv(c, 'balloon')}><path d="M76 66a9 10 0 1 1 18 0c0 6-4 10-7 14h-4c-3-4-7-8-7-14z" fill={c.night ? '#7A5A8A' : '#E8892B'} /><path d="M82 56Q85 66 82.4 78M88 56Q85 66 87.6 78" stroke="#FFF3D6" strokeWidth="1.2" fill="none" opacity=".75" /><path d="M83 82h4v4h-4z" fill={c.tone.near} /></g>,
    P(S.victorian(190), c.tone.near, 'v'),
    c.lit && P('M198 132h4v5h-4zM210 132h4v5h-4zM182 120h3v4h-3z', c.lit, 'w'),
    ...plants(c, 'palm', [[150, 74, -3], [286, 80, 3], [306, 72, 4]], c.tone.near, 'p'),
    bird(c, 'b1', 24, 40, 8),
  ],
  claremont: (c) => [
    range(51, 86, 54, c.tone.far, (snowy(c.month) || c.month === 4 || c.month === 11) && c.tone.snow, { waves: [0.011, 0.03, 0.08] }),
    range(53, 130, 12, c.tone.mid, null, { jag: 1 }),
    P(S.shops(120, 6) + S.clockTower(250, 52), c.tone.near, 'b'),
    P('M246 108a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z', c.lit || '#EADFC8', 'cl'),
    <g key="hands" stroke={c.night ? '#2A2440' : '#3A3350'} strokeLinecap="round"><line x1="250" y1="108" x2={(250 + 2.2 * Math.sin(((c.hour % 12) * 30 + c.minute / 2) * Math.PI / 180)).toFixed(2)} y2={(108 - 2.2 * Math.cos(((c.hour % 12) * 30 + c.minute / 2) * Math.PI / 180)).toFixed(2)} strokeWidth=".9" /><line x1="250" y1="108" x2={(250 + 3.4 * Math.sin(c.minute * 6 * Math.PI / 180)).toFixed(2)} y2={(108 - 3.4 * Math.cos(c.minute * 6 * Math.PI / 180)).toFixed(2)} strokeWidth=".6" /></g>,
    c.night && [112, 128, 144, 160, 176, 192, 208].map((x, i) => <circle key={'sl' + i} cx={x} cy={124 + (i % 2) * 3} r="1.1" fill="#FFD58A" {...mv(c, 'twinkle', { animationDelay: `${i * 0.35}s` })} />),
    c.lit && P('M124 138h10v6h-10zM158 136h10v6h-10zM192 138h10v6h-10z', c.lit, 'w'),
    ...plants(c, 'oak', [[80, 16], [300, 18], [-40, 15], [420, 17], [520, 14]], c.tone.near, 't', 0.8),
    bird(c, 'b1', 30, 36, 14),
  ],
  'san-dimas': (c) => [
    range(61, 92, 40, c.tone.far, null, { waves: [0.012, 0.03, 0.07], jag: 1 }),
    range(63, 118, 22, c.tone.mid, null, { waves: [0.015, 0.035, 0.06], jag: 0.8 }),
    range(65, 138, 10, c.tone.near, null, { waves: [0.02, 0.05, 0.08], jag: 0.5 }),
    ...plants(c, 'oak', [[40, 15], [130, 19], [250, 14], [330, 17], [-90, 16], [470, 15]], c.tone.near, 'o', 0.9),
    hawk(c, 'hk', 150, 50, 30, 26), bird(c, 'b1', 28, 42, 12),
  ],
  'big-bear': (c) => [
    range(71, 80, 58, c.tone.far, c.month <= 4 || c.month >= 11 ? c.tone.snow : null),
    P(S.water(124), c.tone.water, 'w'),
    sea(c, S.waves(71, 124), c.night ? '#3A4470' : 'rgba(255,255,255,.45)', 'wv', 7),
    ...plants(c, 'pine', [-150, -132, -110, -95, -70, 330, 352, 372, 400, 430, 470, 500, 530].map((x, i) => [x, 46 + (i % 3) * 12]), c.tone.near, 'p', 0.9),
    P(S.cabin(40), c.tone.near, 'c'),
    c.lit && P('M47 138h6v5h-6z', c.lit, 'cw'),
    smoke(c, 'sm', 57, 126, 3, c.night ? '#8A84A8' : '#F4EFE8'),
    bird(c, 'eagle', 40, 46, 9, true),
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
      ...plants(c, 'palm', [[-20, 70, -4], [0, 58, 3], [420, 74, 5], [440, 62, -2], [120, 50, -3]], c.tone.near, 'p'),
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
      ...plants(c, 'joshuaTree', [[60, 70, 4], [150, 52, 9], [290, 78, 13], [360, 46, 21], [-60, 58, 5], [470, 64, 31]], c.tone.near, 'jt', 0.7),
      hawk(c, 'hk', 200, 46, 30, 24),
    ]
  },
  'joshua-tree': (c) => [
    range(171, 112, 26, c.tone.far, snowy(c.month) && c.month !== 12 && c.month !== 1 ? null : null, { jag: 1.6 }),
    range(173, 128, 14, c.tone.mid, null, { jag: 1.1 }),
    P('M-160 138Q-60 133 40 136T240 135T560 137V150H-160Z', c.night ? '#2A2340' : '#D9B98A', 'sand'),
    P(S.boulders(300, 1.1) + S.boulders(-70, 0.9) + S.boulders(468, 0.8), c.night ? '#4A4066' : c.tone.mid, 'bd'),
    ...plants(c, 'joshuaTree', [[60, 74, 3], [140, 56, 8], [215, 80, 14], [260, 48, 22], [-20, 62, 5], [420, 70, 31], [520, 54, 6]], c.tone.near, 'jt', 0.7),
    <g key="tw" transform="translate(0 146)"><g {...mv(c, 'tumble')} style={c.still ? { transform: 'translateX(170px)' } : undefined}><circle r="4.6" fill="none" stroke={c.night ? '#7A6A5A' : '#8A6B45'} strokeWidth=".9" /><path d="M-4 -1.5Q0 -5 4 -1.5M-4 1.5Q0 5 4 1.5M-1.5 -4.4Q2 0 -1.5 4.4M1.5 -4.4Q-2 0 1.5 4.4" fill="none" stroke={c.night ? '#7A6A5A' : '#8A6B45'} strokeWidth=".7" /></g></g>,
    c.night && !c.still && <path key="meteor" d="M0 0L-24 9" stroke="#FFF" strokeWidth="1.3" strokeLinecap="round" transform="translate(84 14)" className="shoot" />,
    hawk(c, 'hk', 130, 52, 28, 23),
  ],
  'long-beach': (c) => [
    P(S.skyline(91, 260, 560, 14, 46), c.tone.far, 'sk'),
    c.lit && P(S.windows(91, 262, 560, 6, 44), c.lit, 'skw'),
    P(S.water(132), c.tone.water, 'w'),
    sea(c, S.waves(93, 132), c.night ? '#2E3866' : 'rgba(255,255,255,.4)', 'wv', 8),
    P(S.crane(-70, 54) + S.crane(10, 60) + S.crane(70, 56), c.tone.mid, 'cr'),
    <g key="liner" {...mv(c, 'bob', { animationDuration: '6s' })}>
      <path d={S.liner(215, 134)} fill={c.tone.near} /><path d={S.funnels(215, 134)} fill={c.night ? '#7A2A2A' : '#C8402E'} />
      {c.lit && <path d={S.portholes(215, 134)} fill={c.lit} />}
    </g>,
    smoke(c, 's1', 195, 101, 3, c.night ? '#8A84A8' : '#E8E4EC'), smoke(c, 's2', 215, 101, 3, c.night ? '#8A84A8' : '#E8E4EC'), smoke(c, 's3', 235, 101, 3, c.night ? '#8A84A8' : '#E8E4EC'),
    ...plants(c, 'palm', [[330, 58, 3], [350, 70, -4], [480, 64, 2]], c.tone.near, 'p'),
    bird(c, 'g1', 36, 36, 5), bird(c, 'g2', 52, 46, 20),
  ],
  'san-diego': (c) => [
    P(S.skyline(101, 200, 420, 12, 50), c.tone.far, 'sk'),
    c.lit && P(S.windows(101, 202, 420, 6, 48), c.lit, 'skw'),
    range(103, 136, 10, c.tone.mid, null, { x0: -160, x1: 120, jag: 0.6 }),
    P(S.lighthouse(24), c.tone.near, 'lh'),
    c.lit && <g key="beam" {...mv(c, 'sweep', { transformOrigin: '24px 108px' })}><path d="M24 108L-150 90V106Z" fill="#FFE6A8" opacity=".3" /><path d="M24 108L198 90V106Z" fill="#FFE6A8" opacity=".3" /></g>,
    P(S.water(138), c.tone.water, 'w'),
    sea(c, S.waves(105, 138), c.night ? '#2E3866' : 'rgba(255,255,255,.45)', 'wv', 8),
    ...[[90, 1, 141], [160, 0.8, 143], [300, 1.1, 142], [470, 0.9, 141]].map(([x, s, y], i) => <g key={'b' + i} {...mv(c, 'boat', { animationDuration: `${5 + i * 1.3}s`, animationDelay: `${-i * 1.1}s` })}><path d={S.hull(x, s, y)} fill={c.tone.near} /><path d={S.sails(x, s, y)} fill={c.sail} /></g>),
    ...plants(c, 'palm', [[400, 60, 3], [520, 70, -3]], c.tone.near, 'p'),
    bird(c, 'g1', 34, 38, 7),
  ],
  kona: (c) => [
    P(S.volcano(320, 520, 62), c.tone.far, 'v1'),
    P(S.volcano(40, 300, 40), c.tone.mid, 'v2'),
    P(S.water(132), c.tone.water, 'w'),
    sea(c, S.waves(111, 132), c.night ? '#2E3866' : 'rgba(255,255,255,.6)', 'wv', 6),
    sea(c, 'M-160 146Q-60 140 40 145T240 144T560 146V150H-160Z', c.night ? '#3B4470' : '#F5EEDC', 'surf', 5),
    <g key="cn" {...mv(c, 'bob', { animationDuration: '4s' })}><path d={S.canoe(150, 138)} fill={c.tone.near} /></g>,
    smoke(c, 'st', 320, 88, 3, c.night ? '#FF9A5A' : '#EDE8E2'),
    c.night && <circle key="lava" cx="320" cy="89" r="2.6" fill="#FF7A3A" {...mv(c, 'twinkle', { animationDuration: '2.4s' })} />,
    ...plants(c, 'palm', [[300, 82, 8], [320, 66, -4], [-60, 74, -6], [480, 70, 5]], c.tone.near, 'p'),
    bird(c, 'b1', 40, 40, 11),
  ],
  washington: (c) => {
    const blossom = c.month === 3 || c.month === 4
    const glow = c.night ? '#EDE6D2' : c.tone.near
    return [
      P(S.skyline(121, -160, 560, 6, 16), c.tone.far, 'sk'),
      P(S.capitol(130), glow, 'cap'),
      P(S.obelisk(300, 110), glow, 'ob'),
      c.night && <path key="red" d="M298.6 47h1.2v1.6h-1.2zM300.4 47h1.2v1.6h-1.2z" fill="#FF4D4D" {...mv(c, 'blink')} />,
      ...plants(c, 'roundTree', [-120, -100, -80, 220, 240, 380, 400, 420, 520].map((x) => [x, 9]), blossom && !c.night ? '#F0A9C4' : c.tone.near, 't', 0.9),
      blossom && !c.night && !c.still && [30, 90, 150, 210, 270, 330, 390].map((x, i) => <ellipse key={'pt' + i} cx={x} cy={70} rx="1.6" ry="1" fill="#F7C6D8" className="petal" style={{ animationDelay: `${-i * 1.3}s`, animationDuration: `${7 + (i % 3)}s` }} />),
      bird(c, 'b1', 30, 38, 6),
    ]
  },
  'new-york': (c) => [
    P(S.skyline(131, -160, 560, 20, 66), c.tone.far, 'sk1'),
    P(S.skyline(133, -120, 520, 12, 40) + S.spireTower(200), c.tone.mid, 'sk2'),
    c.lit && P(S.windows(133, -120, 520, 6, 64, 0.5), c.lit, 'w'),
    c.night && <path key="spire" d="M199.3 92h1.4v-30h-1.4z" fill="#BFD7FF" {...mv(c, 'blink', { animationDuration: '3.2s' })} />,
    P(S.water(140), c.tone.water, 'wt'),
    sea(c, S.waves(135, 140), c.night ? '#2E3866' : 'rgba(255,255,255,.35)', 'wv', 8),
    <g key="ferry" transform="translate(0 139)"><g className={c.still ? '' : 'glide'} style={c.still ? { transform: 'translateX(120px)' } : { animationDuration: '34s' }}><path d="M0 0h26l3-4H6z" fill={c.tone.near} /><path d="M8 -4h14v-4H8z" fill={c.night ? '#2C2448' : '#F2EEE8'} /></g></g>,
    bird(c, 'g1', 40, 36, 9), bird(c, 'g2', 58, 48, 24),
  ],
  paris: (c) => {
    // Lit gold from nightfall to a quarter to midnight, sparkling for five minutes on the hour
    const gold = c.night && c.hour >= 17 && (c.hour < 23 || c.minute < 45), sparkle = gold && c.minute < 5
    return [
      range(141, 132, 8, c.tone.far, null, { jag: 0.5 }),
      <Eiffel key="et" x={250} h={116} colour={gold ? '#E9B04A' : c.tone.mid} />,
      c.night && <g key="beam" {...mv(c, 'spin', { transformOrigin: '250px 34px', animationDuration: '9s' })}><path d="M250 34L322 30.5V37.5Z" fill="#FFF3C0" opacity=".22" /><path d="M250 34L178 30.5V37.5Z" fill="#FFF3C0" opacity=".3" /></g>,
      sparkle && <g key="sp">{S.stars(7, 30).map(([x, y], i) => <circle key={i} cx={250 + ((x % 40) - 20) * (y / 80)} cy={40 + y * 1.3} r=".9" fill="#FFF" className={c.still ? '' : 'twinkle'} style={{ animationDelay: `${(i % 5) * 0.2}s` }} />)}</g>,
      P(S.rooftops(143, -160, 560), c.tone.near, 'rt'),
      c.lit && P(S.windows(143, -160, 560, 4, 24, 0.5), c.lit, 'w'),
      bird(c, 'b1', 36, 36, 6), bird(c, 'b2', 22, 46, 20),
    ]
  },
  beijing: (c) => [
    range(151, 108, 34, c.tone.far, c.month <= 2 || c.month === 12 ? c.tone.snow : null, { jag: 1.5 }),
    P(S.templeOfHeaven(200), c.tone.near, 'th'),
    P(S.finial(200), '#E9B04A', 'fi'),
    c.lit && P('M195 130h3v4h-3zM202 130h3v4h-3z', c.lit, 'w'),
    ...plants(c, 'pine', [60, 80, 100, 300, 320, 340, -60, -40, 460, 480].map((x, i) => [x, 30 + (i % 3) * 8]), c.tone.near, 'p', 0.8),
    P('M-160 150V140H560V150Z', c.tone.near, 'wall'),
    <g key="kite" {...mv(c, 'kite')}><path d="M300 40l7 9-7 12-7-12z" fill="#E0452E" /><path d="M300 40V61M293 49H307" stroke="#FFE7A8" strokeWidth=".6" /><path d="M300 61Q296 78 304 96T300 132" fill="none" stroke={c.night ? '#BFB6D9' : '#3A3350'} strokeWidth=".6" /></g>,
    c.lit && [[168, 126], [232, 126]].map(([x, y], i) => <circle key={'ln' + i} cx={x} cy={y} r="2.2" fill="#FF6A3D" {...mv(c, 'twinkle', { animationDuration: '2.8s', animationDelay: `${i * 0.7}s` })} />),
    bird(c, 'b1', 30, 40, 8),
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
