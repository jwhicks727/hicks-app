import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { Card } from '../ui/Card.jsx'
import { liturgicalDay, readingsUrl } from '../lib/cal/liturgy.js'
import { parts, MONTHS, WEEKDAYS } from '../lib/cal/dates.js'

const kept = new Map()
/** The readings for a date and Mass, through the readings function (family only, nothing stored). */
function useReadings(session, date, variant) {
  const key = `${date}/${variant || ''}`
  const [state, setState] = useState(kept.get(key) || { data: null, error: null })
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    if (kept.has(key)) { setState(kept.get(key)); return undefined }
    setState({ data: null, error: null })
    supabase.functions.invoke('readings', { body: { date, variant: variant || '' } }).then(({ data, error }) => {
      const s = error ? { data: null, error: error.context?.status === 404 || !error.context?.status ? 'The readings aren’t set up in the app yet.' : 'USCCB couldn’t be read just now.' } : { data, error: null }
      if (!error) kept.set(key, s)
      if (live) setState(s)
    })
    return () => { live = false }
  }, [session, date, variant, key])
  return state
}

/** A reading's lines: the psalm's refrain stands out. */
function ReadingText({ text }) {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} className={/^R\.\s/.test(para) ? 'refrain' : ''}>
      {para.split('\n').map((l, j, all) => <span key={j}>{l}{j < all.length - 1 && <br />}</span>)}
    </p>
  ))
}

/** The Mass readings, read in the app; USCCB's own page is always a tap away. */
export default function Readings({ date, variant, session }) {
  const { data, error } = useReadings(session, date, variant)
  const lit = liturgicalDay(date)
  const [y, m, d] = parts(date)
  const outside = data && data.url ? data.url : readingsUrl(date)
  return (
    <>
      <header className="hero span-6">
        <Crumb to={`/calendar/day/${date}`}>{WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}</Crumb>
        <span className="kicker">The readings · {MONTHS[m - 1]} {d}</span>
        <h1 className="greet">{(data && data.title) || lit.name}</h1>
        {data && data.lectionary && <span className="eyebrow">Lectionary {data.lectionary}</span>}
      </header>
      {data && data.masses && data.masses.length > 0 && (
        <div className="choice-row span-6 mass-picks" role="group" aria-label="Which Mass">
          {data.masses.map((ms) => (
            <button key={ms.variant || 'main'} type="button" aria-pressed={(variant || '') === ms.variant}
              onClick={() => navigate(`/calendar/day/${date}/readings${ms.variant ? `/${ms.variant}` : ''}`, { replace: true })}>{ms.label}</button>
          ))}
        </div>
      )}
      {!session && <Card tint={lit.colourHex} label="The readings" glyph="calendar" className="span-6"><p>Sign in to read them here, or read them at USCCB.</p></Card>}
      {session && !data && !error && <p className="muted span-6">Opening the readings…</p>}
      {error && <Card tint={lit.colourHex} label="The readings" glyph="calendar" className="span-6"><p>{error}</p></Card>}
      {data && data.readings.length === 0 && <Card tint={lit.colourHex} label="The readings" glyph="calendar" className="span-6"><p>The page didn’t read cleanly this time. USCCB’s own page has them.</p></Card>}
      {data && data.readings.map((r, i) => (
        <article key={i} className="reading span-6" style={{ '--lc': lit.colourHex }}>
          <h2><span>{r.name}</span>{r.citation && <b>{r.citation}</b>}</h2>
          <div className="reading-text"><ReadingText text={r.text} /></div>
        </article>
      ))}
      <Card tint={lit.colourHex} label="Where they come from" glyph="calendar" className="span-6 reading-foot">
        <p className="muted small">The USCCB’s readings page: Lectionary for Mass © Confraternity of Christian Doctrine. Read here privately by the family; nothing is kept.</p>
        <div className="form-actions"><a className="btn ghost" href={outside} target="_blank" rel="noopener noreferrer">Read at USCCB ›</a><Link className="btn ghost" to={`/calendar/day/${date}`}>Back to the day</Link></div>
      </Card>
    </>
  )
}
