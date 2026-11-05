import { useEffect, useState } from 'react'
import { Link } from '../../shell/Link.jsx'
import { reducedMotion } from '../../lib/motion.js'
import { petsDrawing } from '../../lib/drawings.js'
import { useDrawings, useDrawingUrls } from '../../lib/useDrawings.js'
import './pets.css'

// The launch of Pets (docs/DECISIONS-LOG.md, 2026-11-05): a twilight scene drawn in code, with Anna's own
// drawing of the cats hanging from a clothesline in the middle of it. Three cats peek up over the wall
// beneath (their colours as she drew them), hearts and stars rise the way she scattered them on her page,
// and Zappa, our giant white husky, howls at the moon. It plays by itself the first time Pets is opened on
// a device, then rests as a still picture, and "Watch it again" plays it once more. Under Reduce Motion it
// never plays: the resting picture is all there is. Every shape here is code; nothing is from an image
// generator, and her drawing is shown whole, as she drew it (it comes from her gallery, behind sign-in).
const SEEN = 'teamhicks.pets.launched'
const seen = () => { try { return localStorage.getItem(SEEN) === '1' } catch { return false } }
const markSeen = () => { try { localStorage.setItem(SEEN, '1') } catch { /* played again next time: fine */ } }

// The rising hearts and stars: [x, kind, size, drift, seconds, delay]
const RISERS = [
  [8, 'h', 8, -4, 4.2, 1.1], [18, 's', 6, 5, 3.8, 1.3], [27, 'h', 10, 3, 4.6, 1.2], [36, 's', 7, -6, 3.9, 1.5], [45, 'h', 7, 4, 4.4, 1.35],
  [54, 's', 9, -3, 4.1, 1.6], [63, 'h', 9, 6, 4.7, 1.45], [72, 's', 6, -5, 3.7, 1.7], [81, 'h', 8, 4, 4.3, 1.55], [90, 's', 8, -4, 4.0, 1.8],
  [14, 's', 9, 6, 4.5, 2.1], [40, 'h', 6, -5, 3.9, 2.25], [68, 'h', 7, 3, 4.2, 2.2], [86, 's', 6, -3, 3.8, 2.4], [30, 'h', 8, 5, 4.4, 2.6], [58, 's', 7, -4, 4.0, 2.7],
]
// Her page had stars and hearts scattered among the pictures: these stay, in the sky behind the drawing
const SKY = [[6, 5, 's', 4], [34, 4, 'h', 3.5], [60, 5, 's', 3], [74, 22, 's', 3.5], [96, 38, 'h', 4], [72, 60, 'h', 4], [9, 58, 's', 4.5], [37, 61, 'h', 4], [62, 62, 's', 3.5]]
const HEART = 'M12 21.2s-7.6-4.7-9.7-9.4C1 8.7 2.7 5 6.2 5c2 0 3.7 1.1 5.8 3.3C14.1 6.1 15.8 5 17.8 5c3.5 0 5.2 3.7 3.9 6.8-2.1 4.7-9.7 9.4-9.7 9.4z'
const STAR = 'M12 2.6l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.1l-5.8 3.3 1.3-6.5L2.7 9.4l6.5-.8z'
const Shape = ({ kind, size, className, style }) => (
  <svg x={0} y={0} width={size} height={size} viewBox="0 0 24 24" overflow="visible" className={className} style={style} aria-hidden="true">
    {kind === 'h' ? <path d={HEART} fill="#F4A6C2" stroke="#D45B8A" strokeWidth="1.6" strokeLinejoin="round" /> : <path d={STAR} fill="#F8E15B" stroke="#E2B92F" strokeWidth="1.4" strokeLinejoin="round" />}
  </svg>
)

/** A cat's head peeking over the wall, in the colours of one of Anna's three. */
function Cat({ look, x, i }) {
  const L = {
    grey: { fur: '#DCD2C8', earL: '#DCD2C8', earR: '#DCD2C8', patches: <><ellipse cx="36" cy="38" rx="15" ry="9" fill="#B8A898" /><ellipse cx="64" cy="40" rx="9" ry="6" fill="#C9BBAC" /></> },
    pied: { fur: '#F7F4F0', earL: '#F7F4F0', earR: '#2B2330', patches: <path d="M56 27C74 21 92 34 89 54 80 57 66 49 57 38z" fill="#2B2330" /> },
    calico: { fur: '#F6E8CF', earL: '#EA9340', earR: '#2B2330', patches: <><ellipse cx="29" cy="40" rx="16" ry="13" fill="#EA9340" /><ellipse cx="73" cy="41" rx="14" ry="11" fill="#2B2330" /></> },
  }[look]
  return (
    <g className="pt-cat" style={{ '--i': i }} transform={`translate(${x} 63) scale(.24)`}>
      <g className="pt-cat-in">
        <polygon className="pt-ear" points="12,42 18,6 47,28" fill={L.earL} />
        <polygon points="20,35 22,16 38,27" fill="#EBA3B8" />
        <g className="pt-ear pt-ear-r"><polygon points="88,42 82,6 53,28" fill={L.earR} /><polygon points="80,35 78,16 62,27" fill={look === 'pied' || look === 'calico' ? '#7A5A6E' : '#EBA3B8'} /></g>
        <ellipse cx="50" cy="60" rx="41" ry="32" fill={L.fur} />
        {L.patches}
        <g className="pt-eyes"><ellipse cx="33" cy="58" rx="6.5" ry="8.5" fill="#2A2230" /><ellipse cx="67" cy="58" rx="6.5" ry="8.5" fill="#2A2230" /><circle cx="35.2" cy="55" r="2.4" fill="#fff" /><circle cx="69.2" cy="55" r="2.4" fill="#fff" /></g>
        <path d="M46 68h8l-4 5z" fill="#E58AA5" />
        <path d="M50 73q-5 5-10 2M50 73q5 5 10 2" fill="none" stroke="#2A2230" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M24 70L5 66M24 74L5 77M76 70l19-4M76 74l19 3" stroke="#2A2230" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </g>
  )
}

/** Zappa, giant and white, sitting on the wall with his head back and his mouth open. */
function Zappa() {
  return (
    <g className="pt-zappa" transform="translate(62 42.4) scale(.27)">
      <g className="pt-zappa-in">
        <path d="M100 128c14 2 24-8 22-24-1-9-6-14-6-22" fill="none" stroke="#F4F1F6" strokeWidth="13" strokeLinecap="round" />
        <ellipse cx="78" cy="112" rx="34" ry="30" fill="#EEEAF1" />
        <ellipse cx="57" cy="88" rx="23" ry="42" fill="#FBF9F6" transform="rotate(-8 57 88)" />
        <rect x="44" y="98" width="15" height="48" rx="7.5" fill="#E6E8F1" />
        <rect x="31" y="98" width="15" height="48" rx="7.5" fill="#FFFFFF" />
        <ellipse cx="38" cy="146" rx="12" ry="5.5" fill="#FFFFFF" /><ellipse cx="52" cy="146" rx="11" ry="5" fill="#E6E8F1" />
        <path d="M46 70c8 6 22 6 30 0" fill="none" stroke="#C9CCE0" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <g className="pt-zhead">
          <g transform="rotate(50 52 58) translate(-6.2 -10.4) scale(1.12)">
            <polygon points="34,22 40,-2 54,16" fill="#FFFFFF" /><polygon points="38,19 41,5 49,16" fill="#D9D3E4" />
            <ellipse cx="46" cy="34" rx="21" ry="19" fill="#FFFFFF" />
            <path d="M34 28C28 32 14 30 2 33c-2 5 0 9 4 10 10 1 22 0 31-4z" fill="#FFFFFF" />
            <path d="M8 44c9 5 22 5 32 0l-2 9c-9 4-21 3-29-1z" fill="#F0ECF5" />
            <path d="M12 46c8 3 19 3 27-1" fill="none" stroke="#B66D84" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="3.5" cy="35" rx="4" ry="3.2" fill="#3A3140" />
            <path d="M38 27q5-4 10 0" fill="none" stroke="#3A3140" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M30 24c3-2 5-2 8-1" fill="none" stroke="#C9CCE0" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </g>
  )
}

export default function PetsLaunch() {
  const g = useDrawings()
  const hung = petsDrawing(g.list)
  const urls = useDrawingUrls(hung ? [hung.thumb_path || hung.path] : [])
  const src = hung ? urls[hung.thumb_path || hung.path] : null
  // Plays by itself the first time on this device, never under Reduce Motion
  const [run, setRun] = useState(() => (!reducedMotion() && !seen() ? 1 : 0))
  useEffect(() => { markSeen() }, [])
  const again = () => setRun((n) => n + 1)
  const canPlay = !reducedMotion()
  return (
    <section className="span-6 pt-wrap" aria-label="Zappa and the cats">
      <div className={'pt-stage' + (run ? ' play' : '')} key={run}>
        <svg className="pt-scene" viewBox="0 0 100 120" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="pt-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4F4380" /><stop offset=".42" stopColor="#B0679A" /><stop offset=".72" stopColor="#F0A1A6" /><stop offset="1" stopColor="#FAD7B0" />
            </linearGradient>
            <radialGradient id="pt-moon" cx=".4" cy=".38" r=".7"><stop offset="0" stopColor="#FFFBEA" /><stop offset="1" stopColor="#F6E3B4" /></radialGradient>
            <linearGradient id="pt-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5A3A5E" /><stop offset="1" stopColor="#3A2440" /></linearGradient>
          </defs>
          <rect width="100" height="120" fill="url(#pt-sky)" />
          <g className="pt-moon"><circle cx="84" cy="14" r="18" fill="#FFE9B8" opacity=".16" /><circle cx="84" cy="14" r="10.5" fill="url(#pt-moon)" /><circle cx="81" cy="11.5" r="2" fill="#E9D3A0" opacity=".7" /><circle cx="87.5" cy="17" r="1.5" fill="#E9D3A0" opacity=".7" /><circle cx="86.5" cy="9.8" r="1" fill="#E9D3A0" opacity=".7" /></g>
          {SKY.map(([x, y, k, s], n) => <g key={n} transform={`translate(${x - s / 2} ${y - s / 2})`}><g className="pt-twinkle" style={{ '--d': (n % 5) * 0.3 }}><Shape kind={k} size={s} /></g></g>)}
          <path d="M-2 10.2Q50 12.6 102 10.2" fill="none" stroke="#6D4B3F" strokeWidth=".55" />
          <g className="pt-cats"><Cat look="grey" x={0} i={0} /><Cat look="pied" x={22.5} i={1} /><Cat look="calico" x={45} i={2} /></g>
          <Zappa />
          <path className="pt-waves" d="M70.6 40.4A5 5 0 0 1 76.4 40.4M68.1 36.9A9 9 0 0 1 78.9 36.9M65.9 33.8A13 13 0 0 1 81.1 33.8" fill="none" stroke="#FFE9B8" strokeWidth="1.1" strokeLinecap="round" />
          <g className="pt-awoo-g"><text className="pt-awoo" x="98.5" y="29.8" textAnchor="end" aria-hidden="true">{'awoooo'.split('').map((c, k) => <tspan key={k} className="pt-awoo-l" style={{ '--k': k }}>{c}</tspan>)}</text></g>
          <path d="M-2 84C20 82 40 83.5 60 82.5S92 82 102 83.5V121H-2z" fill="url(#pt-wall)" />
          <rect x="-2" y="82.6" width="104" height="1.4" fill="#8A5E86" opacity=".55" />
          <path d="M0 98h100M0 108h100M12 84v37M44 84v37M76 84v37" stroke="#2E1B34" strokeOpacity=".35" strokeWidth=".5" />
          {RISERS.map(([x, k, s, dx, t, d], n) => (
            <g key={n} className="pt-riser" transform={`translate(${x} 100)`}>
              <g className="pt-riser-in" style={{ '--dx': `${dx * 2}px`, '--t': `${t}s`, '--d': `${d}s`, '--r': `${dx * 4}deg` }}><Shape kind={k} size={s} /></g>
            </g>
          ))}
        </svg>
        <div className="pt-paper">
          <span className="pt-pin pt-pin-l" aria-hidden="true" /><span className="pt-pin pt-pin-r" aria-hidden="true" />
          {src
            ? <Link to={'/drawings/' + hung.id} className="pt-drawing" aria-label={`${hung.title}, a drawing by Anna. Open it.`}><img src={src} alt={`${hung.title}, Anna’s drawing of our pets`} width={hung.width || undefined} height={hung.height || undefined} style={{ aspectRatio: hung.width && hung.height ? `${hung.width} / ${hung.height}` : '3 / 2' }} /></Link>
            : <Link to="/drawings" className="pt-drawing pt-empty"><b>Anna’s drawing of the pets will hang here</b><span>{g.missing ? 'Anna’s Gallery needs its one-time database step first.' : 'Add it in Anna’s Gallery and mark it “Our pets”.'}</span></Link>}
        </div>
      </div>
      <div className="pt-under">
        <span className="pt-cap">{src ? 'Anna’s drawing hangs above them. Tap it to see it large.' : 'Zappa and the cats, waiting for Anna’s drawing.'}</span>
        {canPlay && <button type="button" className="btn ghost" onClick={again}>Watch it again</button>}
      </div>
    </section>
  )
}
