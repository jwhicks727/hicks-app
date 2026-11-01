import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { observancesOn } from '../lib/cal/observances.js'
import { usePrefs } from '../lib/prefs.js'
import { useWildPictures } from '../lib/useOutside.js'
import WildArt from './WildArt.jsx'
import './wild.css'

/**
 * What's in season out there: the eagles, the monarchs, the whales, each with
 * a drawing, and with its own site's picture and credit when the `wild`
 * function has read one (a tap on the picture opens that site).
 */
export default function WildNow({ date, className = 'span-3', title = 'Wild right now' }) {
  const [prefs] = usePrefs()
  const wild = observancesOn(date, prefs.calendarGroups || null).filter((o) => o.group === 'wild')
  const pics = useWildPictures()
  const [bad, setBad] = useState({})
  if (!wild.length) return null
  const pictures = pics && pics.pictures ? pics.pictures : {}
  return (
    <Card tint="#5F8A4A" label={title} glyph="bird" className={className + ' wild-card'}>
      <ul className="wild">
        {wild.map((o) => {
          const p = pictures[o.id] && !bad[o.id] ? pictures[o.id] : null
          return (
            <li key={o.id} className={p ? 'has-pic' : ''}>
              {p && (
                <figure className="wild-photo">
                  <a href={p.page} target="_blank" rel="noopener noreferrer" aria-label={`${o.name}: a picture from ${p.credit}`}>
                    <img src={p.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad((b) => ({ ...b, [o.id]: true }))} />
                  </a>
                  <figcaption>Picture: <a href={p.page} target="_blank" rel="noopener noreferrer">{p.credit}</a></figcaption>
                </figure>
              )}
              <div className="wild-row">
                <WildArt id={o.id} size={p ? 44 : 72} />
                <div className="wild-t">
                  <b>{o.name}</b>
                  <span>{o.word}.</span>
                  {o.links && <span className="wild-links">{o.links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{l} ›</a>)}</span>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
