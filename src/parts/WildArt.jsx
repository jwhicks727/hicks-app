// A drawing for each wild season, made in code (no pictures from anywhere): the
// card's graphic when a site's own picture isn't there yet, and beside it when it is.

const TILE = { eagles: ['#7FA6D6', '#C9DCEE'], monarchs: ['#F2B04A', '#FBE3B0'], whales: ['#2F6E9C', '#7DB6D8'], wildflowers: ['#7DB36A', '#E8EFC4'], 'poppy-day': ['#F4C46A', '#FCE9B8'], 'elephant-seals': ['#C9B58E', '#EBDDBE'], grunion: ['#243B66', '#4A6BA0'], 'migration-spring': ['#2B3A6B', '#7A8FCF'], 'migration-fall': ['#3B2F5A', '#C98A6A'], 'fall-colour': ['#E8B84A', '#F7E3A0'], hummingbirds: ['#8FC3A0', '#E6F2D8'] }
const ART = {
  eagles: <g><path d="M4 52c10-6 22-8 34-6l22 6v12H4z" fill="#6B4A2E" /><path d="M16 50c0-12 8-20 18-20 8 0 14 6 14 14v8z" fill="#5A3B22" /><circle cx="36" cy="26" r="10" fill="#FFF8EE" /><path d="M43 24l10 4-9 5z" fill="#F2B33D" /><circle cx="39" cy="23.5" r="1.8" fill="#2B2019" /><path d="M31 21q4-4 9-2" stroke="#E7DFD0" strokeWidth="1.2" fill="none" /></g>,
  monarchs: <g><path d="M32 30C20 12 6 14 8 28c1 8 12 12 24 6zM32 30C44 12 58 14 56 28c-1 8-12 12-24 6z" fill="#EE8A2B" stroke="#2B2019" strokeWidth="2" /><path d="M32 34C22 46 12 50 16 56c4 4 12-2 16-12zM32 34C42 46 52 50 48 56c-4 4-12-2-16-12z" fill="#F29A3A" stroke="#2B2019" strokeWidth="2" /><path d="M32 22v26" stroke="#2B2019" strokeWidth="3" strokeLinecap="round" /><g fill="#FFF">{[[12, 24], [18, 20], [52, 24], [46, 20], [22, 50], [42, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.5" />)}</g></g>,
  whales: <g><path d="M0 46q8-4 16 0t16 0 16 0 16 0v18H0z" fill="#245A86" /><path d="M32 46c0-10-2-16-8-22 4 0 8 2 10 6 2-4 6-6 10-6-6 6-8 12-8 22z" fill="#1E3A52" /><path d="M32 18c-3-4-1-8 0-10 1 2 3 6 0 10zM26 14q3-3 6 0M38 14q-3-3-6 0" stroke="#E8F4FB" strokeWidth="2" fill="none" strokeLinecap="round" /></g>,
  wildflowers: <g>{[[14, 38, '#F2741F'], [32, 28, '#F59A2B'], [50, 40, '#EE5D1B']].map(([x, y, c], i) => <g key={i}><path d={`M${x} 62V${y + 6}`} stroke="#3E7A4C" strokeWidth="2.4" /><g fill={c}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x} cy={y - 6} rx="4.2" ry="6.4" transform={`rotate(${a} ${x} ${y})`} />)}</g><circle cx={x} cy={y} r="2.6" fill="#7A3A12" /></g>)}</g>,
  'poppy-day': <g><path d="M32 62V36" stroke="#3E7A4C" strokeWidth="3" /><g fill="#F2741F">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="32" cy="22" rx="7" ry="11" transform={`rotate(${a} 32 32)`} />)}</g><circle cx="32" cy="32" r="4" fill="#7A3A12" /></g>,
  'elephant-seals': <g><path d="M0 52q16-6 32-2t32 0v14H0z" fill="#D9C79C" /><path d="M8 52c2-14 14-20 28-18 8 1 12 6 10 12l8 4-12 2c-8 4-26 6-34 0z" fill="#8F7F6D" /><path d="M44 34c4-4 8-2 8 4l-6 2z" fill="#7C6D5D" /><circle cx="46" cy="38" r="1.6" fill="#2B2019" /></g>,
  grunion: <g><circle cx="48" cy="14" r="8" fill="#F6EED2" /><path d="M0 50q16-5 32 0t32 0v14H0z" fill="#D9C79C" /><g fill="#D8E4F2" stroke="#9FB4CE" strokeWidth=".8">{[[14, 52, -8], [30, 56, 6], [44, 53, -4]].map(([x, y, r], i) => <path key={i} transform={`rotate(${r} ${x} ${y})`} d={`M${x - 8} ${y}Q${x} ${y - 4} ${x + 8} ${y}Q${x} ${y + 4} ${x - 8} ${y}M${x + 8} ${y}l5-3v6z`} />)}</g></g>,
  'migration-spring': <g><circle cx="46" cy="16" r="8" fill="#F6EED2" /><g fill="none" stroke="#FFF8EE" strokeWidth="2" strokeLinecap="round">{[[16, 34], [26, 40], [36, 46], [24, 28], [34, 34], [10, 44], [46, 40]].map(([x, y], i) => <path key={i} d={`M${x - 5} ${y}Q${x - 2.5} ${y - 4} ${x} ${y}Q${x + 2.5} ${y - 4} ${x + 5} ${y}`} />)}</g></g>,
  'migration-fall': <g><circle cx="46" cy="16" r="8" fill="#F6E3C0" /><g fill="none" stroke="#FFF1DC" strokeWidth="2" strokeLinecap="round">{[[14, 30], [24, 38], [34, 46], [22, 24], [32, 32], [10, 42], [44, 38]].map(([x, y], i) => <path key={i} d={`M${x - 5} ${y}Q${x - 2.5} ${y - 4} ${x} ${y}Q${x + 2.5} ${y - 4} ${x + 5} ${y}`} />)}</g></g>,
  'fall-colour': <g><path d="M30 64V14M34 64V20" stroke="#F4EEE0" strokeWidth="5" /><g fill="#F2C23A">{[[22, 16], [40, 14], [16, 28], [46, 26], [24, 40], [42, 38], [30, 8], [12, 44], [50, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6.5" />)}</g><g fill="#E8A21E">{[[30, 22], [36, 32], [20, 34], [48, 34]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.6" />)}</g></g>,
  hummingbirds: <g><path d="M38 50c4 2 8 6 12 12M44 46c6 0 10 6 12 14" stroke="#3E7A4C" strokeWidth="2.4" fill="none" /><g fill="#E85D9A">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="52" cy="44" rx="3.6" ry="6" transform={`rotate(${a} 52 48)`} />)}</g><path d="M10 32c8-10 22-10 30-2l8-6-6 10c-2 8-12 14-24 12 4-4 4-8 0-14z" fill="#3E8E5C" /><path d="M10 32l-8-2 10 4z" fill="#2B2019" /><circle cx="30" cy="30" r="5.6" fill="#E0408A" /><path d="M24 18q10-6 20 2-8-1-12 3z" fill="#2E7048" /></g>,
  default: <g><path d="M12 54C12 28 30 12 54 10c0 24-14 42-42 44z" fill="#4E8A5A" /><path d="M14 52L44 20" stroke="#E6F2D8" strokeWidth="2" /></g>,
}

/** The drawing for a season (by its id), on a tile of its own sky. */
export default function WildArt({ id, size = 72 }) {
  const [a, b] = TILE[id] || ['#7DB36A', '#E8EFC4']
  const gid = 'wa-' + id
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="" aria-hidden="true" className="wild-art">
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="64" height="64" rx="6" fill={`url(#${gid})`} />
      {ART[id] || ART.default}
    </svg>
  )
}
