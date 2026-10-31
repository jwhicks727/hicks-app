import SunCalc from 'suncalc'
import { HOME_TOWN, COMPASS, bearing, lengthWords, moonLitPath, moonName, FULL_MOON_NAMES } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'
import { Card } from '../ui/Card.jsx'

const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, weekday: 'short', month: 'short', day: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, month: 'numeric' })

function nextFullMoon(now) {
  let prev = SunCalc.getMoonIllumination(now).phase
  for (let i = 1; i < 124; i++) {
    const when = new Date(now.getTime() + i * 6 * 36e5), q = SunCalc.getMoonIllumination(when).phase
    if (prev < 0.5 && q >= 0.5) return when
    prev = q
  }
  return null
}

/** The sky today, worked out on the device: sun times, daylight, your shadow, the moon. */
export default function SkyToday() {
  const now = useNow()
  const { lat, lng } = HOME_TOWN
  const t = SunCalc.getTimes(now, lat, lng), y = SunCalc.getTimes(new Date(now.getTime() - 864e5), lat, lng)
  const len = t.sunset - t.sunrise, dd = Math.round((len - (y.sunset - y.sunrise)) / 1000), ad = Math.abs(dd)
  const pos = SunCalc.getPosition(now, lat, lng), alt = (pos.altitude * 180) / Math.PI, sunB = bearing(pos.azimuth)
  const mp = SunCalc.getMoonPosition(now, lat, lng), mi = SunCalc.getMoonIllumination(now)
  const nextRise = now < t.sunrise ? t.sunrise : SunCalc.getTimes(new Date(now.getTime() + 864e5), lat, lng).sunrise
  let light = null, caption
  if (alt > 0.5) {
    light = { alt, sun: true, o: 1 }
    const noon = SunCalc.getPosition(t.solarNoon, lat, lng).altitude
    caption = <>Your shadow right now is <b>{lengthWords(1 / Math.tan((alt * Math.PI) / 180))}</b>, pointing {COMPASS[Math.round(((sunB + 180) % 360) / 45) % 8]}. Shortest at {hm.format(t.solarNoon)}, {lengthWords(1 / Math.tan(noon)).replace('about ', '')}.</>
  } else if (mp.altitude > 0.05) {
    light = { alt: (mp.altitude * 180) / Math.PI, sun: false, o: 0.25 + 0.45 * mi.fraction }
    caption = <>The sun is down; shadows come back at {hm.format(nextRise)}. The moon is up, {Math.round(mi.fraction * 100)}% lit{mi.fraction > 0.5 ? ': on a clear night it casts a faint shadow of its own.' : '.'}</>
  } else caption = <>The sun is down; shadows come back at {hm.format(nextRise)}. The moon is still below the horizon.</>

  const night = alt <= -6, dusk = !night && alt < 8
  const sky = night ? ['#1B1838', '#3B2F5E'] : dusk ? ['#7D6FA8', '#F2A86E'] : ['#7EB3E0', '#E9E2CF']
  const px = 66, gy = 86, H = 32, R = 54
  let lightEl = null, shadowEl = null
  if (light) {
    const a = (Math.max(light.alt, 1.5) * Math.PI) / 180, L = Math.min(H / Math.tan(a), 200 - px), sx = px - R * Math.cos(a), sy = gy - R * Math.sin(a), tip = px + L
    lightEl = (
      <>
        <line x1={sx} y1={sy} x2={Math.min(tip, 200)} y2={gy} stroke={light.sun ? '#F4A62A' : '#F2E9C9'} strokeWidth="1.2" strokeDasharray="3 3" opacity=".9" />
        {light.sun ? <><circle cx={sx} cy={sy} r="12" fill="#FFD36A" opacity=".35" /><circle cx={sx} cy={sy} r="7" fill="#FFC83D" stroke="#C47A12" strokeWidth="1.2" /></> : <circle cx={sx} cy={sy} r="6" fill="#F2E9C9" stroke="#8B7B52" />}
      </>
    )
    shadowEl = <path d={`M${px - 5} ${gy}Q${px + (tip - px) * 0.5} ${gy + 6} ${tip} ${gy + 2}Q${px + (tip - px) * 0.5} ${gy - 1} ${px + 5} ${gy}Z`} fill={`rgba(30,20,15,${(0.42 * light.o).toFixed(2)})`} />
  }
  const ink = night ? '#0E0B18' : '#2B2019', ground = night ? '#3E3540' : '#D8BE96'
  const full = mi.fraction > 0.985 ? null : nextFullMoon(now)
  const mt = SunCalc.getMoonTimes(now, lat, lng)

  return (
    <Card tint="#D6664D" label="The sky today" glyph="sunmoon" className="span-3">
      <div className="sun-list">
        <div><small>Sunrise</small><b>{hm.format(t.sunrise)}</b></div>
        <div><small>Golden hour</small><b>{hm.format(t.goldenHour)}</b></div>
        <div><small>Sunset</small><b>{hm.format(t.sunset)}</b></div>
        <div><small>Last light</small><b>{hm.format(t.dusk)}</b></div>
      </div>
      <p><b>{Math.floor(len / 36e5)} h {Math.round((len % 36e5) / 6e4)} m of daylight</b>, {ad >= 60 ? `${Math.floor(ad / 60)} m ` : ''}{ad % 60} s {dd < 0 ? 'less' : 'more'} than yesterday</p>
      <div className="sky-pair">
        <figure>
          <svg viewBox="0 0 160 116" aria-hidden="true">
            <defs><linearGradient id="sd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
            <rect width="160" height="116" rx="6" fill="url(#sd-sky)" />
            {night && <g fill="#FFF1BF"><circle cx="14" cy="14" r=".9" /><circle cx="40" cy="30" r=".7" /><circle cx="118" cy="12" r="1" /><circle cx="146" cy="38" r=".7" /><circle cx="96" cy="26" r=".6" /></g>}
            {lightEl}
            <path d={`M0 ${gy}H160V110a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6Z`} fill={ground} />
            {shadowEl}
            <circle cx={px} cy={gy - 29} r="4.4" fill={ink} />
            <path fill={ink} d={`M${px - 5} ${gy - 23}Q${px} ${gy - 25.5} ${px + 5} ${gy - 23}L${px + 6} ${gy - 11}H${px + 3.4}L${px + 2.8} ${gy}H${px + 0.7}L${px} ${gy - 9}L${px - 0.7} ${gy}H${px - 2.8}L${px - 3.4} ${gy - 11}H${px - 6}Z`} />
          </svg>
          <figcaption><p>{caption}</p></figcaption>
        </figure>
        <figure>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="6" fill="#1E1733" />
            <circle cx="18" cy="20" r="1.1" fill="#FFF1BF" /><circle cx="84" cy="16" r=".9" fill="#FFF1BF" /><circle cx="78" cy="86" r="1" fill="#FFF1BF" />
            <circle cx="50" cy="50" r="38" fill="#F2E9C9" opacity={(0.04 + 0.1 * mi.fraction).toFixed(2)} />
            <circle cx="50" cy="50" r="32" fill="#3A3552" />
            <g transform={`translate(50 50)${mi.phase < 0.5 ? '' : ' scale(-1 1)'}`}><path d={moonLitPath(mi.fraction, 32)} fill="#F2E9C9" /></g>
          </svg>
          <figcaption>
            <b>{moonName(mi.phase)}</b>
            <span>{Math.round(mi.fraction * 100)}% lit</span>
            {mt.rise && <span>Rises {hm.format(mt.rise)}</span>}
            {mt.set && <span>Sets {hm.format(mt.set)}</span>}
            <span>{full ? <>Full {dayFmt.format(full)}, the {FULL_MOON_NAMES[+monthFmt.format(full) - 1]} Moon</> : <b>Full tonight</b>}</span>
          </figcaption>
        </figure>
      </div>
    </Card>
  )
}
