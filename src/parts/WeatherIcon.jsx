// The weather's pictures, drawn on a 24-unit grid with a little colour.
const SUN = '#F2B33D', CLOUD = '#B9C3D3', CLOUD_EDGE = '#7D8AA3', RAIN = '#4A7FD6', MOON = '#F3E3A6'
const cloud = (dx = 0, dy = 0) => <path transform={`translate(${dx} ${dy})`} d="M7 18.5h10.2a3.8 3.8 0 0 0 .4-7.6 5.3 5.3 0 0 0-10.2 1.3A3.2 3.2 0 0 0 7 18.5z" fill={CLOUD} stroke={CLOUD_EDGE} strokeWidth="1.3" strokeLinejoin="round" />
const sun = (cx, cy, r) => <g><circle cx={cx} cy={cy} r={r} fill={SUN} />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={cx + Math.cos(a) * (r + 1.6)} y1={cy + Math.sin(a) * (r + 1.6)} x2={cx + Math.cos(a) * (r + 3.4)} y2={cy + Math.sin(a) * (r + 3.4)} stroke={SUN} strokeWidth="1.6" strokeLinecap="round" /> })}</g>
const moon = (cx, cy, r) => <path d={`M${cx + r * 0.3} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.7} ${r * 1.55}A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.3} ${cy - r}z`} fill={MOON} stroke="#C9B26A" strokeWidth="1" />
const drops = (n, long) => Array.from({ length: n }, (_, i) => <line key={i} x1={9 + i * 3.4} y1="20" x2={8 + i * 3.4} y2={long ? 23.5 : 21.8} stroke={RAIN} strokeWidth="1.6" strokeLinecap="round" />)

const PICS = {
  clear: sun(12, 12, 4.6),
  night: moon(11, 12, 6.5),
  partly: <g>{sun(9, 9, 3.6)}{cloud(1, 1)}</g>,
  'night-partly': <g>{moon(8.5, 8, 4.5)}{cloud(1, 1)}</g>,
  cloudy: <g>{cloud(-2, -3)}{cloud(1, 0)}</g>,
  fog: <g stroke={CLOUD_EDGE} strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="6" y1="13" x2="18" y2="13" /><line x1="4" y1="17" x2="20" y2="17" /></g>,
  drizzle: <g>{cloud(0, -3)}{drops(3, false)}</g>,
  rain: <g>{cloud(0, -3)}{drops(3, true)}</g>,
  snow: <g>{cloud(0, -3)}{[9, 13, 17].map((x) => <text key={x} x={x - 1.6} y="23.4" fontSize="6" fill={RAIN}>✱</text>)}</g>,
  thunder: <g>{cloud(0, -3)}<path d="M12.5 15.5l-2.5 4h3l-1.5 4 4.2-5.5h-3l1.6-2.5z" fill={SUN} stroke="#B07A12" strokeWidth=".6" /></g>,
}

export default function WeatherIcon({ pic, size = 28, label }) {
  return <svg className="wx-icon" viewBox="0 0 24 24" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>{PICS[pic] || PICS.cloudy}</svg>
}
