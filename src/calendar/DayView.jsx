import SunCalc from 'suncalc'
import { navigate } from '../lib/router.js'
import { calPath, stepDate } from '../lib/cal/paths.js'
import { dayView } from '../lib/cal/day.js'
import { liturgicalDay, readingsUrl, SEASON_NAMES, COLOUR_NAMES, cycles } from '../lib/cal/liturgy.js'
import { invitation, PRAYERS } from '../lib/cal/prayers.js'
import { parishDay, PARISH } from '../lib/cal/sacredHeart.js'
import { spanWords } from '../lib/cal/observances.js'
import { addDays, parts, dow } from '../lib/cal/dates.js'
import { HOME_TOWN, moonName } from '../lib/sky.js'
import { reducedMotion } from '../lib/motion.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { KIND_STYLE, observanceGlyph } from './kinds.js'
import { Glyph, MoonGlyph } from './Glyph.jsx'
import { useSwipe } from './useSwipe.js'
import { occasionFor } from '../lib/occasions.js'
import { OccasionChip } from '../ui/Glow.jsx'

const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })
const hourNow = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
const middayOf = (d) => { const [y, m, dd] = parts(d); return new Date(Date.UTC(y, m - 1, dd, 20)) } // noon in winter, 1 PM in summer
const sentence = (t) => (/[.!?”]$/.test(t) ? t : t + '.')
const CONFETTI = ['#F03E2F', '#F2C14E', '#5FA85A', '#4A7FD6', '#8A5BC4', '#F08A3C']

export default function DayView({ date, today, data, signedIn }) {
  const dv = dayView(date, data), lit = dv.lit
  const inv = invitation(date, lit, date === today ? hourNow() : 9)
  const parish = parishDay(date, lit, liturgicalDay(addDays(date, 1)))
  const swipe = useSwipe(() => navigate(calPath('day', stepDate('day', date, 1)), { replace: true }), () => navigate(calPath('day', stepDate('day', date, -1)), { replace: true }))
  const celebrate = dv.family.filter((f) => f.kind !== 'remember'), remember = dv.family.filter((f) => f.kind === 'remember')
  const others = dv.observances.filter((o) => o.group !== 'nature'), sky = dv.observances.filter((o) => o.group === 'nature')
  const cyc = cycles(date), sundayReadings = dow(date) === 0 || ['solemnity', 'principal', 'triduum'].includes(lit.rank)
  return (
    <div className="day-stack span-6" {...swipe} key={date}>
      <OccasionChip occasion={occasionFor(dv)} day={date} className="day-occasion" />
      {celebrate.map((f) => (
        <article key={f.id || f.title} className="celebrate">
          {!reducedMotion() && <span className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${(i * 5.6 + 2).toFixed(1)}%`, '--d': `${(i % 6) * 0.7}s`, '--c': CONFETTI[i % 6] }} />)}</span>}
          <span className="cel-when">{date === today ? 'Today is' : date > today ? 'Coming up' : 'This day'}</span>
          <b className="cel-t">{f.title}</b>
          {f.line && <span className="cel-sub">{f.line}</span>}
        </article>
      ))}
      {remember.map((f) => (
        <Card key={f.id || f.title} tint="#6B4A8E" label={f.title} glyph="candle" className="remember">
          {f.line && <p>{f.line}</p>}
          <p className="prayer">“{PRAYERS.eternalRest.text}”</p>
        </Card>
      ))}

      <Card tint={lit.colourHex} label="In the Church" glyph="calendar" tag={COLOUR_NAMES[lit.colour]} className="church-card">
        <h2>{lit.name}</h2>
        <p className="lit-meta">{[!['Weekday', 'Sunday'].includes(lit.rankWords) && lit.rankWords, SEASON_NAMES[lit.season].replace(/^the /, 'The '), sundayReadings ? `Sunday readings, Year ${cyc.sunday}` : `Weekday readings, Year ${cyc.weekday}`].filter(Boolean).join(' · ')}</p>
        {lit.optional && !inv.own && <p>Or keep <b>{lit.optional}</b>.</p>}
        <div className="lit-flags">
          {lit.obligation && <span className="flag">{dow(date) === 0 ? 'Sunday Mass' : 'A holy day of obligation'}</span>}
          {lit.transferred && <span className="flag">Moved to today this year</span>}
          {lit.fasting === 'fast' && <span className="flag strong">A day of fasting and abstinence</span>}
          {lit.fasting === 'abstinence' && <span className="flag">No meat today</span>}
        </div>
        <div className="pray">
          <p className="pray-words">{inv.words}</p>
          {inv.invocation && <p className="prayer">“{inv.invocation}”</p>}
          {inv.prayer && (
            <details className="prayer-text">
              <summary>Pray {PRAYERS[inv.prayer].name.replace(/^The /, 'the ').replace(/^An /, 'an ')}</summary>
              <p className="prayer">{PRAYERS[inv.prayer].text}</p>
            </details>
          )}
        </div>
        <a className="btn ghost" href={readingsUrl(date)} target="_blank" rel="noopener noreferrer">The day’s readings ›</a>
      </Card>

      <Card tint="#B8322A" label={`At ${PARISH.name}`} glyph="calendar" tag={PARISH.town} className="parish-card">
        {parish.note && <p className="nudge">{parish.note}</p>}
        <ul className="times">{parish.mass.map((t) => { const [, at, what] = t.match(/^(\d{1,2}:\d\d [AP]M),?\s*(.*)$/) || [null, t, '']; return <li key={t}><b>{at}</b>{what && <span> {what}</span>}</li> })}</ul>
        {parish.confession && <p><b>Confession</b> {parish.confession}</p>}
        <p className="muted small">Mass times from {PARISH.source.replace(/^The /, 'the ')}, not yet checked with the parish.</p>
      </Card>

      {(others.length > 0 || dv.ongoing.some((o) => o.group !== 'nature')) && (
        <Card tint="#E0662F" label="Also today" glyph="star" className="also-card">
          {others.length > 0 && <ul className="obs">
            {others.map((o) => (
              <li key={o.id} style={{ '--c': KIND_STYLE[o.group].colour }}>
                <span className="ml-g"><Glyph name={observanceGlyph(o)} /></span>
                <span><b>{o.name}</b>{spanWords(o) && <span className="ml-sub"> · {spanWords(o)}</span>}<br /><span className="obs-w">{o.word}</span></span>
              </li>
            ))}
          </ul>}
          {dv.ongoing.filter((o) => o.group !== 'nature').length > 0 && (
            <p className={others.length ? 'ongoing' : 'ongoing alone'}>Still going: {dv.ongoing.filter((o) => o.group !== 'nature').map((o) => `${o.name} (${spanWords(o)})`).join('; ')}</p>
          )}
        </Card>
      )}

      <SkyCard date={date} sky={sky} moon={dv.moon} />

      <Card tint="#453644" label="Our calendars" glyph="calendar" className="events-card">
        {!signedIn && <p>Sign in on the <Link to="/settings">Settings</Link> page to see the family’s own days and events.</p>}
        {signedIn && dv.events.length === 0 && <p className="muted">Nothing from our calendars on this day.</p>}
        {dv.events.length > 0 && (
          <ul className="obs">
            {dv.events.map((e) => (
              <li key={e.id} style={{ '--c': (KIND_STYLE[e.kind] || KIND_STYLE.event).colour }}>
                <span className="ml-g"><Glyph name={(KIND_STYLE[e.kind] || KIND_STYLE.event).glyph} /></span>
                <span><b>{e.title}</b>{e.school && <span className="ml-sub"> · {e.kind === 'no_school' ? 'No school at' : 'At'} {e.school.name}</span>}{e.starts_at && <span className="ml-sub"> · {hm.format(new Date(e.starts_at))}{e.ends_at ? `–${hm.format(new Date(e.ends_at))}` : ''}</span>}{e.ends_on > e.starts_on && <span className="ml-sub"> · {e.starts_on.slice(5)} to {e.ends_on.slice(5)}</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/** The sun and moon on this day at home, and the sky's own events. */
function SkyCard({ date, sky, moon }) {
  const mid = middayOf(date)
  const t = SunCalc.getTimes(mid, HOME_TOWN.lat, HOME_TOWN.lng)
  const yt = SunCalc.getTimes(new Date(mid.getTime() - 864e5), HOME_TOWN.lat, HOME_TOWN.lng)
  const len = (t.sunset - t.sunrise) / 60000, ylen = (yt.sunset - yt.sunrise) / 60000, diff = Math.round(len - ylen)
  const evening = new Date(mid.getTime() + 9 * 3600e3)
  const mi = SunCalc.getMoonIllumination(evening)
  return (
    <Card tint="#3BA3A8" label="The sky" glyph="sunmoon" className="sky-card">
      <div className="sky-row">
        <MoonGlyph phase={mi.phase} size={56} className="big-moon" />
        <div>
          <p><b>{moon ? (moon.key === 'full' ? `${moon.moonName}: full tonight` : moon.name) : moonName(mi.phase)}</b>, {Math.round(mi.fraction * 100)}% lit this evening</p>
          <p>Sunrise <b>{hm.format(t.sunrise)}</b> · sunset <b>{hm.format(t.sunset)}</b></p>
          <p className="muted">{Math.floor(len / 60)} h {Math.round(len % 60)} min of daylight, {diff === 0 ? 'about the same as the day before' : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'minute' : 'minutes'} ${diff > 0 ? 'more' : 'less'} than the day before`}</p>
        </div>
      </div>
      {sky.length > 0 && (
        <ul className="obs">
          {sky.map((o) => (
            <li key={o.id} style={{ '--c': KIND_STYLE.nature.colour }}>
              <span className="ml-g"><Glyph name={observanceGlyph(o)} /></span>
              <span><b>{o.name}</b>{o.at && <span className="ml-sub"> · at {hm.format(o.at)}</span>}<br /><span className="obs-w">{sentence(o.word)}{o.meteors && (mi.fraction > 0.5 ? ' A bright moon will wash out the fainter ones.' : ' The moon stays out of the way.')}{o.clocks && /back/.test(o.name) ? ` Sunset tonight at ${hm.format(t.sunset)}.` : ''}</span></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
