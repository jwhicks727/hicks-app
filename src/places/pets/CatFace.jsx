// Kona, Portia and Goldie, drawn in code, shared by the Pets launch (PetsLaunch.jsx) and the cat that
// invites everyone to Pets from Home (PetsInvite.jsx). Each is drawn in its own 100-unit square; whoever
// shows one places and scales it. The class names on the ears and eyes are what the two animate.

/**
 * Anna's three cats, as Jason describes them: Kona is white with blue eyes and one calico splotch on her head,
 * Portia is a mostly black tuxedo, and Goldie is a calico. Where the picture and the words differ, the words win.
 */
const LOOKS = {
  kona: {
    fur: '#FCFBF9', earL: '#FCFBF9', earR: '#FCFBF9', inner: '#F3AABD', innerR: '#F3AABD', outline: '#D6CDE0', eyes: 'blue', whisker: '#2A2230', paw: '#FCFBF9', pawLine: '#D6CDE0',
    marks: <><path d="M20 44C18 36 24 31 32 31C40 30 46 35 44 42C42 47 36 48 30 47C24 47 21 47 20 44Z" fill="#EA9340" /><path d="M29 38C32 33 40 34 40 39C39 44 31 44 29 38Z" fill="#2B2330" /></>,
  },
  portia: {
    fur: '#2B2330', earL: '#2B2330', earR: '#2B2330', inner: '#8A5B7A', innerR: '#8A5B7A', eyes: 'amber', whisker: '#F6F0F8', paw: '#FCFBF9', pawLine: '#CFC6D6',
    marks: <><path d="M47.5 36L52.5 36L54 66L46 66Z" fill="#FCFBF9" /><path d="M30 74C34 67 44 66 50 70C56 66 66 67 70 74C68 85 59 92 50 92C41 92 32 85 30 74Z" fill="#FCFBF9" /></>,
  },
  goldie: {
    fur: '#F6E8CF', earL: '#EA9340', earR: '#2B2330', inner: '#EBA3B8', innerR: '#7A5A6E', eyes: 'dark', whisker: '#2A2230', paw: '#F6E8CF', pawLine: '#DCC39C',
    marks: <><ellipse cx="29" cy="40" rx="16" ry="13" fill="#EA9340" /><ellipse cx="73" cy="41" rx="14" ry="11" fill="#2B2330" /></>,
  },
}

/** Round eyes that blink together: dark (the way Anna drew them), blue, or amber (so they show on black fur). */
function Eyes({ kind }) {
  const iris = { blue: '#5AA7E8', amber: '#E8B53A' }[kind]
  return (
    <g className="pt-eyes">
      {[33, 67].map((cx) => iris
        ? <g key={cx}><ellipse cx={cx} cy="58" rx="7.6" ry="9.4" fill={iris} /><ellipse cx={cx} cy="59" rx="3.6" ry="6.6" fill="#1B1824" /><circle cx={cx + 2.4} cy="54.6" r="2.6" fill="#fff" /></g>
        : <g key={cx}><ellipse cx={cx} cy="58" rx="6.5" ry="8.5" fill="#2A2230" /><circle cx={cx + 2.2} cy="55" r="2.4" fill="#fff" /></g>)}
    </g>
  )
}

/** A cat's head, in its own 100-unit drawing: ears from the top at about 6, the chin at 92. */
export default function CatFace({ look }) {
  const L = LOOKS[look], line = L.outline ? { stroke: L.outline, strokeWidth: 1.1, strokeLinejoin: 'round' } : {}
  return (
    <>
      <polygon className="pt-ear" points="12,42 18,6 47,28" fill={L.earL} {...line} />
      <polygon points="20,35 22,16 38,27" fill={L.inner} />
      <g className="pt-ear pt-ear-r"><polygon points="88,42 82,6 53,28" fill={L.earR} {...line} /><polygon points="80,35 78,16 62,27" fill={L.innerR} /></g>
      <ellipse cx="50" cy="60" rx="41" ry="32" fill={L.fur} {...line} />
      {L.marks}
      <Eyes kind={L.eyes} />
      <path d="M46 68h8l-4 5z" fill="#E58AA5" />
      <path d="M50 73q-5 5-10 2M50 73q5 5 10 2" fill="none" stroke="#2A2230" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M24 70L5 66M24 74L5 77M76 70l19-4M76 74l19 3" stroke={L.whisker} strokeOpacity={look === 'portia' ? 0.8 : 0.45} strokeWidth="1.2" strokeLinecap="round" />
    </>
  )
}

/** Two front paws, holding on to an edge: a 64 × 16 drawing, each paw with three toes. */
export function CatPaws({ look }) {
  const L = LOOKS[look]
  return (
    <>
      {[17, 47].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="8.5" rx="11" ry="7" fill={L.paw} stroke={L.pawLine} strokeWidth="1" />
          <path d={`M${cx - 3.6} 11.5v3M${cx} 12v3M${cx + 3.6} 11.5v3`} stroke={L.pawLine} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      ))}
    </>
  )
}
