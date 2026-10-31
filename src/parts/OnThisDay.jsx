import { useEffect, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { todayUrl, shapeToday, TODAY_PAGE } from '../lib/relisten.js'

const KEY = 'teamhicks.onthisday'

/** Jams: shows taped on this day in years gone by, the family's bands first, each a tap from playing on Relisten. */
export default function OnThisDay({ today }) {
  const [state, setState] = useState({ shows: null, error: false })
  const [m, d] = [+today.slice(5, 7), +today.slice(8, 10)]
  useEffect(() => {
    let live = true
    try { const kept = JSON.parse(sessionStorage.getItem(KEY)); if (kept && kept.day === today) { setState({ shows: kept.shows, error: false }); return undefined } } catch { /* nothing kept */ }
    fetch(todayUrl(m, d), { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => { const shows = shapeToday(json).slice(0, 40); try { sessionStorage.setItem(KEY, JSON.stringify({ day: today, shows })) } catch { /* fine */ } if (live) setState({ shows, error: false }) })
      .catch(() => { if (live) setState({ shows: null, error: true }) })
    return () => { live = false }
  }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
  const ours = (state.shows || []).filter((s) => s.ours).slice(0, 8)
  const label = new Date(Date.UTC(2026, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' })
  return (
    <Card tint="#8A5BC4" label={`This day in jam history · ${label}`} glyph="music" className="span-3 onthisday">
      {state.shows === null && !state.error && <p className="muted">Looking through the tapes…</p>}
      {state.error && <p>The tapes couldn’t be reached just now. <a href={TODAY_PAGE} target="_blank" rel="noopener noreferrer">Today on Relisten ›</a></p>}
      {state.shows && (ours.length ? (
        <ul className="otd">
          {ours.map((s, i) => (
            <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer"><span className="fig otd-y">{s.year}</span><span><b>{s.artist}</b><span>{[s.venue, s.place].filter(Boolean).join(', ')}</span></span><em>Play ›</em></a></li>
          ))}
        </ul>
      ) : <p>None of our bands played on this day, as far as the tapes know. <a href={TODAY_PAGE} target="_blank" rel="noopener noreferrer">Everyone else ›</a></p>)}
      <p className="muted small">From Relisten and the Internet Archive’s taped shows, from bands that allow taping.</p>
    </Card>
  )
}
