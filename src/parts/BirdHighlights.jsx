import { highlights } from '../lib/birdPage.js'
import { seenWhen } from '../lib/birdWords.js'
import './birdlists.css'

/**
 * One or two tappable highlights: a rare bird that is doing something worth a look (reported again
 * and again, a big group, there today). Nothing at all on a quiet week. `onOpen(bird)` opens the bird.
 */
export default function BirdHighlights({ list, today, onOpen, titled = true }) {
  const h = highlights(list, today)
  if (!h.length) return null
  return (
    <section className="bh" aria-label="Worth a look">
      {titled && <h3>Worth a look</h3>}
      {h.map(({ bird, why, headline }) => (
        <button key={bird.code} type="button" className="bh-item" onClick={() => onOpen(bird)}>
          {bird.photo ? <img src={bird.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bh-nophoto" aria-hidden="true" />}
          <span className="bh-words">
            <b>{bird.name}</b>
            <span>{headline}{why.length > 1 ? ` · ${why.slice(1).join(' · ')}` : ''}</span>
            <small>Rare round here · last {seenWhen(bird.last, today)}{bird.where ? ` at ${bird.where}` : ''}</small>
          </span>
        </button>
      ))}
    </section>
  )
}
