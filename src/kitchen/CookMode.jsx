import { AltitudeNote, CookedOnTrip } from './TripTag.jsx'
import { useEffect, useState } from 'react'
import { goBack } from '../lib/router.js'
import { iconFor } from '../lib/kitchen/food.js'
import { startTimer } from '../lib/kitchen/timers.js'
import { FoodIcon } from './FoodIcon.jsx'
import { Inline, Prose } from './Inline.jsx'
import { parsed, PEOPLE } from './art.js'
import { useSwipe } from '../calendar/useSwipe.js'
import Timers from './Timers.jsx'
import { DISHES } from '../lib/mindful.js'

/** Keeps the screen awake while cooking, where the phone allows it. */
function useWakeLock() {
  useEffect(() => {
    let lock = null, live = true
    const ask = async () => { try { if (live && navigator.wakeLock && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen') } catch { /* not here */ } }
    ask()
    document.addEventListener('visibilitychange', ask)
    return () => { live = false; document.removeEventListener('visibilitychange', ask); if (lock) lock.release().catch(() => {}) }
  }, [])
}

/** Cook mode: one step at a time, big, with its timer; Back leaves it. */
export default function CookMode({ data, slug, parent }) {
  useWakeLock()
  const [i, setI] = useState(0)
  const [showIngredients, setShowIngredients] = useState(false)
  const r = data.recipe ? parsed(data.recipe.body) : null
  const swipe = useSwipe(() => setI((x) => Math.min(x + 1, r ? r.steps.length : 0)), () => setI((x) => Math.max(0, x - 1)))
  useEffect(() => {
    const key = (e) => { if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, r ? r.steps.length : 0)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [r])
  if (!r) return null
  const done = i >= r.steps.length
  const s = r.steps[i]
  const plates = [['L', 'Laurie’s plate', parent ? data.laurie : null], ['J', 'Jason’s plate', r.sections.find((x) => x.name === 'Jason’s plate')?.body], ['A', 'Anna’s add-on', r.sections.find((x) => x.name === 'Anna’s add-on')?.body]].filter(([, , b]) => b)
  const plating = r.sections.find((x) => x.name === 'Plating')
  return (
    <div className="cook-mode" {...swipe}>
      <header className="cm-head">
        <button type="button" className="icon-btn" onClick={() => goBack(`/kitchen/recipe/${slug}`)} aria-label="Leave cook mode">✕</button>
        <span className="cm-title">{r.title}</span>
        <button type="button" className="btn ghost cm-ing" onClick={() => setShowIngredients((v) => !v)} aria-expanded={showIngredients}>Ingredients</button>
      </header>
      <AltitudeNote />
      <ol className="cm-dots" aria-label={`Step ${Math.min(i + 1, r.steps.length)} of ${r.steps.length}`}>
        {r.steps.map((x, k) => <li key={x.n} className={k < i ? 'past' : k === i ? 'now' : ''}><button type="button" onClick={() => setI(k)} aria-label={`Step ${x.n}`} /></li>)}
      </ol>
      {showIngredients && (
        <ul className="cm-ingredients">
          {r.groups.flat().map((x) => <li key={x.text}><FoodIcon name={iconFor(x.item)} size={26} /><span>{x.amount && <b>{x.amount}{x.unit ? ` ${x.unit}` : ''}</b>} {x.item}</span></li>)}
        </ul>
      )}
      <main className="cm-body" key={i}>
        {!done ? (
          <>
            <p className="cm-n">Step {s.n} of {r.steps.length}{s.time && <> · {s.time}</>}</p>
            <p className="cm-text"><Inline text={s.text} /></p>
            {s.minutes != null && <button type="button" className="btn cm-timer" onClick={() => startTimer({ label: `Step ${s.n}: ${r.title}`, minutes: s.minutes, recipe: slug })}>Start a {s.time} timer</button>}
          </>
        ) : (
          <>
            <p className="cm-n">Plate it</p>
            {plating && <div className="cm-plating"><Prose text={plating.body} /></div>}
            <div className="cm-plates">{plates.map(([k, t, b]) => <div key={k} className="plate" style={{ '--p': PEOPLE[k].colour }}><h3>{t}</h3><Prose text={b} /></div>)}</div>
            <blockquote className="mindful-q cm-dishes">“{DISHES[0]}”<span>{DISHES[1]}, {DISHES[2]}</span></blockquote>
            {data.recipe && <CookedOnTrip recipeId={data.recipe.id} parent={parent} />}
          </>
        )}
      </main>
      <nav className="cm-nav">
        <button type="button" className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back a step</button>
        {!done ? <button type="button" className="btn" onClick={() => setI(i + 1)}>{i === r.steps.length - 1 ? 'Plate it ›' : 'Next ›'}</button>
          : <button type="button" className="btn" onClick={() => goBack(`/kitchen/recipe/${slug}`)}>Done</button>}
      </nav>
      <Timers />
    </div>
  )
}
