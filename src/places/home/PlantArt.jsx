import { PLANT_FORMS, POTS, PLANT_SIZES } from '../../lib/garden.js'

// A potted plant from the side, drawn in code: its type's shape (sword
// leaves, trailing vines, fronds, a rosette, a column), its size, and its
// pot. Drawn standing on y = 0, centred on x = 0, in px at its real-ish
// scale, so a room's plants side by side show which is which and how big.

const seeded = (seed) => { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const G = ['#2F6B34', '#3E8A3E', '#4E9A44', '#5FAE4E', '#73BF5C']

/** A leaf from (x, y), `len` long at `deg` (0 = straight up), `w` wide. */
function Leaf({ x, y, len, deg, w, fill, vein = true, notch = 0 }) {
  const tip = `0 ${-len}`
  const d = notch
    ? `M0 0 C${w} ${-len * 0.2} ${w * 1.1} ${-len * 0.7} 0 ${-len} C${-w * 1.1} ${-len * 0.7} ${-w} ${-len * 0.2} 0 0 Z`
    : `M0 0 Q${w} ${-len * 0.45} ${tip} Q${-w} ${-len * 0.45} 0 0 Z`
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <path d={d} fill={fill} />
      {notch > 0 && Array.from({ length: notch }, (_, k) => { const t = (k + 1) / (notch + 1); return <path key={k} d={`M${w * 0.95} ${-len * t} L${w * 0.25} ${-len * t + 3} M${-w * 0.95} ${-len * t} L${-w * 0.25} ${-len * t + 3}`} stroke="var(--pa-wall, #F4EAD8)" strokeWidth="2.2" strokeLinecap="round" /> })}
      {vein && <path d={`M0 -2 L0 ${-len * 0.92}`} stroke="rgba(255, 255, 255, .35)" strokeWidth="1" />}
    </g>
  )
}

/** The plant above the pot's rim (y = 0 is the soil), for a form, `h` tall. */
function Foliage({ form, h, w, r }) {
  const out = []
  const g = () => G[Math.floor(r() * G.length)]
  if (form === 'upright') {
    for (let k = 0; k < 7; k++) { const deg = -18 + k * 6 + (r() - 0.5) * 6, len = h * (0.7 + r() * 0.3); out.push(<g key={k}><Leaf x={(k - 3) * 2} y={0} len={len} deg={deg} w={w * 0.07} fill={k % 2 ? '#2E5E34' : '#3D7A3F'} vein={false} /><Leaf x={(k - 3) * 2} y={0} len={len * 0.94} deg={deg} w={w * 0.03} fill="#C9C26A" vein={false} /></g>) }
  } else if (form === 'trailing') {
    for (let k = 0; k < 3; k++) { const side = k === 1 ? 1 : -1, x0 = side * w * (0.25 + k * 0.06); out.push(<path key={'v' + k} d={`M${x0} 0 C${x0 + side * 12} ${h * 0.4} ${x0 + side * 4} ${h * 0.9} ${x0 + side * 10} ${h * (1 + k * 0.25)}`} stroke="#3E7A3A" strokeWidth="1.6" fill="none" />); for (let q = 1; q < 6; q++) { const t = q / 6; out.push(<Leaf key={`l${k}${q}`} x={x0 + side * (8 * Math.sin(t * 3))} y={h * (1 + k * 0.25) * t} len={9} deg={side * (60 + r() * 50) + 180} w={6} fill={g()} />) } }
    for (let k = 0; k < 11; k++) out.push(<Leaf key={'m' + k} x={(r() - 0.5) * w * 0.7} y={0} len={h * (0.25 + r() * 0.25)} deg={(r() - 0.5) * 140} w={h * 0.12} fill={g()} />)
  } else if (form === 'bushy' || form === 'flowering' || form === 'herb') {
    const n = form === 'herb' ? 22 : 14, s = form === 'herb' ? 0.3 : 0.55
    for (let k = 0; k < n; k++) out.push(<Leaf key={k} x={(r() - 0.5) * w * 0.4} y={0} len={h * (s + r() * 0.35)} deg={(r() - 0.5) * 120} w={h * (form === 'herb' ? 0.1 : 0.13)} fill={g()} />)
    if (form === 'bushy') for (let k = 0; k < 2; k++) out.push(<g key={'f' + k}><path d={`M${(k - 0.5) * 10} 0 L${(k - 0.5) * 14} ${-h * 0.95}`} stroke="#4E8A3E" strokeWidth="1.4" /><Leaf x={(k - 0.5) * 14} y={-h * 0.9} len={h * 0.22} deg={(k - 0.5) * 30} w={h * 0.08} fill="#FBF8EE" vein={false} /></g>)
    if (form === 'flowering') for (let k = 0; k < 6; k++) { const x = (r() - 0.5) * w * 0.8, y = -h * (0.5 + r() * 0.45), c = ['#E8546B', '#F2C14E', '#F28C38', '#C76BD9'][Math.floor(r() * 4)]; out.push(<g key={'b' + k}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 3.6} cy={y + Math.sin((a * Math.PI) / 180) * 3.6} r="3.4" fill={c} />)}<circle cx={x} cy={y} r="2.2" fill="#FFE27A" /></g>) }
  } else if (form === 'tree') {
    out.push(<path key="trunk" d={`M-2 0 C-3 ${-h * 0.3} 3 ${-h * 0.5} 0 ${-h * 0.62}`} stroke="#7A5236" strokeWidth={Math.max(3, w * 0.06)} fill="none" strokeLinecap="round" />)
    for (let k = 0; k < 16; k++) { const y = -h * (0.42 + r() * 0.56), x = (r() - 0.5) * w * 0.55; out.push(<Leaf key={k} x={x} y={y} len={h * 0.17} deg={(r() - 0.5) * 160} w={h * 0.085} fill={g()} />) }
  } else if (form === 'palm') {
    out.push(<path key="stem" d={`M0 0 L0 ${-h * 0.45}`} stroke="#8A6A3B" strokeWidth="3" />)
    for (let k = 0; k < 7; k++) { const a = -75 + k * 25, rad = (a * Math.PI) / 180, L = h * (0.5 + r() * 0.15), x1 = Math.sin(rad) * L, y1 = -h * 0.45 - Math.cos(rad) * L * 0.6; out.push(<g key={k}><path d={`M0 ${-h * 0.45} Q${x1 * 0.5} ${y1 - 14} ${x1} ${y1 + L * 0.35}`} stroke="#3E8A3E" strokeWidth="1.6" fill="none" />{Array.from({ length: 8 }, (_, q) => { const t = (q + 1) / 9, px = x1 * t, py = -h * 0.45 + (y1 + L * 0.35 + h * 0.45) * t - Math.sin(t * Math.PI) * 14; return <Leaf key={q} x={px} y={py} len={8 + q * 0.6} deg={a + 90 + (q % 2 ? 50 : -50)} w={2.4} fill={g()} vein={false} /> })}</g>) }
  } else if (form === 'cactus') {
    const cw = w * 0.22
    out.push(<rect key="c" x={-cw / 2} y={-h} width={cw} height={h} rx={cw / 2} fill="#4E9A54" />)
    out.push(<path key="a1" d={`M${-cw / 2} ${-h * 0.45} h${-cw * 0.6} a${cw * 0.3} ${cw * 0.3} 0 0 0 -${cw * 0.3} ${cw * 0.3} V${-h * 0.75}`} stroke="#4E9A54" strokeWidth={cw * 0.55} fill="none" strokeLinecap="round" />)
    out.push(<path key="a2" d={`M${cw / 2} ${-h * 0.3} h${cw * 0.5} V${-h * 0.62}`} stroke="#4E9A54" strokeWidth={cw * 0.5} fill="none" strokeLinecap="round" />)
    for (let k = 0; k < 3; k++) out.push(<line key={'r' + k} x1={-cw / 4 + k * (cw / 4)} y1={-h + 6} x2={-cw / 4 + k * (cw / 4)} y2={-4} stroke="#3B7D42" strokeWidth="1" />)
    for (let k = 0; k < 14; k++) out.push(<circle key={'s' + k} cx={(r() - 0.5) * cw} cy={-h * r()} r=".8" fill="#F4F0D8" />)
    out.push(<g key="fl">{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3} cy={-h - 1 + Math.sin((a * Math.PI) / 180) * 3} r="2.8" fill="#F28BB0" />)}</g>)
  } else if (form === 'succulent' || form === 'spiky') {
    const n = form === 'spiky' ? 12 : 16
    for (let k = 0; k < n; k++) { const deg = -80 + (k / (n - 1)) * 160, len = form === 'spiky' ? h * (0.6 + r() * 0.4) : h * (0.5 + (1 - Math.abs(deg) / 90) * 0.5); out.push(<Leaf key={k} x={0} y={0} len={len} deg={deg} w={form === 'spiky' ? len * 0.12 : len * 0.32} fill={form === 'spiky' ? G[k % 3] : ['#7FB3A0', '#8FC2AE', '#6EA393'][k % 3]} vein={false} />) }
    if (form === 'succulent') out.push(<circle key="tip" cx="0" cy={-h * 0.2} r={h * 0.12} fill="#A9D3BF" />)
  } else if (form === 'fern') {
    for (let k = 0; k < 9; k++) { const a = -70 + k * 17.5, rad = (a * Math.PI) / 180, L = h * (0.75 + r() * 0.25), x1 = Math.sin(rad) * L, y1 = -Math.cos(rad) * L * 0.8; out.push(<g key={k}><path d={`M0 0 Q${x1 * 0.6} ${y1 * 1.1} ${x1} ${y1 + L * 0.25}`} stroke="#3E8A3E" strokeWidth="1.2" fill="none" />{Array.from({ length: 10 }, (_, q) => { const t = (q + 1) / 11, px = x1 * t, py = (y1 + L * 0.25) * t - Math.sin(t * Math.PI) * L * 0.2; return <Leaf key={q} x={px} y={py} len={5 + (1 - t) * 4} deg={a + (q % 2 ? 60 : -60)} w={2} fill={g()} vein={false} /> })}</g>) }
  } else if (form === 'monstera') {
    for (let k = 0; k < 6; k++) { const a = -60 + k * 24 + (r() - 0.5) * 10, rad = (a * Math.PI) / 180, L = h * (0.55 + r() * 0.3), x1 = Math.sin(rad) * L * 0.8, y1 = -Math.cos(rad) * L; out.push(<g key={k}><path d={`M0 0 Q${x1 * 0.3} ${y1 * 0.6} ${x1} ${y1}`} stroke="#3E7A3A" strokeWidth="1.6" fill="none" /><Leaf x={x1} y={y1 + h * 0.18} len={h * 0.36} deg={a * 0.8} w={h * 0.2} fill={k % 2 ? '#2F6B34' : '#3E8A3E'} notch={3} vein /></g>) }
  } else if (form === 'orchid') {
    for (let k = 0; k < 4; k++) out.push(<Leaf key={k} x={0} y={0} len={h * 0.32} deg={(k % 2 ? 1 : -1) * (55 + k * 8)} w={h * 0.1} fill={G[k % 2 + 1]} />)
    out.push(<path key="stem" d={`M0 0 C2 ${-h * 0.6} ${w * 0.15} ${-h * 0.95} ${w * 0.35} ${-h * 0.8}`} stroke="#5C7A3A" strokeWidth="1.4" fill="none" />)
    for (let k = 0; k < 5; k++) { const t = 0.55 + k * 0.1, x = w * 0.35 * Math.pow(t, 3) + 2, y = -h * (0.6 + 0.35 * Math.sin(t * 2.6)); out.push(<g key={'f' + k}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x + Math.cos((a * Math.PI) / 180) * 3.6} cy={y + Math.sin((a * Math.PI) / 180) * 3.6} rx="3.6" ry="2.6" transform={`rotate(${a} ${x + Math.cos((a * Math.PI) / 180) * 3.6} ${y + Math.sin((a * Math.PI) / 180) * 3.6})`} fill="#E6B8E8" />)}<circle cx={x} cy={y} r="2" fill="#B2399F" /></g>) }
  }
  return out
}

/** The pot, w wide and ph tall, its rim at y = -ph. */
function Pot({ pot, w, ph }) {
  const p = POTS[pot] || POTS.terracotta
  const top = w / 2, bot = w * 0.36
  return (
    <g>
      <path d={`M${-top} ${-ph} L${top} ${-ph} L${bot} 0 L${-bot} 0 Z`} fill={p.colour} />
      {p.stripe && <path d={`M${-top * 0.92} ${-ph * 0.62} L${top * 0.92} ${-ph * 0.62} L${top * 0.88} ${-ph * 0.5} L${-top * 0.88} ${-ph * 0.5} Z`} fill={p.stripe} />}
      {pot === 'basket' && Array.from({ length: 6 }, (_, k) => <line key={k} x1={-top + (k + 0.5) * (w / 6)} y1={-ph} x2={-bot + (k + 0.5) * ((2 * bot) / 6)} y2="0" stroke="#8A6440" strokeWidth="1.2" />)}
      {pot === 'basket' && Array.from({ length: 4 }, (_, k) => <line key={'h' + k} x1={-top + k * 2} y1={-ph + (k + 1) * (ph / 5)} x2={top - k * 2} y2={-ph + (k + 1) * (ph / 5)} stroke="#8A6440" strokeWidth="1" />)}
      <rect x={-top - 2} y={-ph - 5} width={w + 4} height="6" rx="1.5" fill={p.rim} />
      <path d={`M${-top * 0.55} ${-ph + 3} L${-bot * 0.6} -3`} stroke="#FFF" strokeOpacity=".22" strokeWidth={w * 0.07} />
      <ellipse cx="0" cy={-ph - 4} rx={top * 0.88} ry="2.2" fill="#4A3426" />
    </g>
  )
}

/** Its full size: [width, height] in px, for laying out a room. */
export function plantBox(form, size) {
  const k = (PLANT_SIZES[size] || PLANT_SIZES.medium).k
  const f = PLANT_FORMS[form] || PLANT_FORMS.bushy
  return [Math.round(90 * k * f.wide), Math.round((f.tall * 100 + 34) * k + 16)]
}

export default function PlantArt({ form = 'bushy', size = 'medium', pot = 'terracotta', seed = '', title }) {
  const k = (PLANT_SIZES[size] || PLANT_SIZES.medium).k
  const f = PLANT_FORMS[form] || PLANT_FORMS.bushy
  const [W, Hh] = plantBox(form, size)
  const pw = 46 * k * (size === 'tree' ? 1.1 : 1), ph = 34 * k, h = f.tall * 100 * k, w = 90 * k * f.wide
  const r = seeded(seed + form + size)
  return (
    <svg className="plant-art" viewBox={`${-W / 2} ${-Hh} ${W} ${Hh + 8}`} width={W} height={Hh + 8} role="img" aria-label={title}>
      <ellipse cx="0" cy="2" rx={pw * 0.55} ry="4" fill="rgba(40, 25, 10, .18)" />
      <Pot pot={pot} w={pw} ph={ph} />
      <g transform={`translate(0 ${-ph - 4})`}><Foliage form={form} h={h} w={w} r={r} /></g>
    </svg>
  )
}
