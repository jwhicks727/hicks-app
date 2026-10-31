import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { usePrefs } from '../lib/prefs.js'
import { useDraft } from '../lib/useDraft.js'
import { iconFor, cookCheck } from '../lib/kitchen/food.js'
import { easyOnHands } from '../lib/kitchen/recipe.js'
import { startTimer } from '../lib/kitchen/timers.js'
import { rate, addToFridge, finishFridge, removeRecipe } from '../lib/useKitchen.js'
import { FoodIcon, RecipeArt } from './FoodIcon.jsx'
import { Inline, Prose } from './Inline.jsx'
import { parsed, timeWords, PEOPLE } from './art.js'
import Timers from './Timers.jsx'
import { standing as standingOf } from '../lib/kitchen/week.js'
import { StandingBadge, UnicornGlow } from './Unicorn.jsx'

const SECTION_ICON = { Plating: 'star', Heat: 'weather', Herbs: 'bird', Texture: 'star', 'Trader Joe’s shortcuts': 'pot', Notes: 'calendar', 'Why it works': 'star' }
const GROUP_NAMES = (groups) => groups.map((g, i) => {
  if (g.some((x) => /jason|anna|add-on|plate\)/i.test(x.item))) return 'For the plates'
  if (i === 0) return 'Produce and herbs'
  if (i === groups.length - 1 && groups.length > 2) return 'Pantry and fridge'
  return i === 1 ? 'Protein' : ''
})
const hhmm = (mins) => { const h = Math.floor(mins / 60) % 24, m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }

/** One recipe, laid out for someone who reads fast and cooks tired. */
export default function RecipePage({ data, slug, me, members, parent, today, onChanged }) {
  const { recipe, laurie, ratings, fridge, loaded } = data
  const [prefs, update] = usePrefs()
  const [got, setGot] = useDraft(`recipe.${slug}.mise`, {})
  const [checked, setChecked] = useDraft(`recipe.${slug}.check`, {})
  const [removing, setRemoving] = useState(false)
  if (!loaded) return <p className="muted span-6">Opening the recipe…</p>
  if (!recipe) return <><Crumb to="/kitchen">Kitchen</Crumb><Card tint="#C42D20" label="Not found" glyph="pot" className="span-6"><p>No recipe at this address.</p></Card></>
  const r = parsed(recipe.body)
  const names = GROUP_NAMES(r.groups)
  const dinner = prefs.dinnerAt || '18:30'
  const [dh, dm] = dinner.split(':').map(Number)
  const startBy = r.total ? hhmm(dh * 60 + dm - r.total) : null
  const plates = [['L', 'Laurie’s plate', parent ? laurie : null], ['J', 'Jason’s plate', r.sections.find((s) => s.name === 'Jason’s plate')?.body], ['A', 'Anna’s add-on', r.sections.find((s) => s.name === 'Anna’s add-on')?.body]].filter(([, , body]) => body)
  const rest = r.sections.filter((s) => !['Jason’s plate', 'Anna’s add-on'].includes(s.name))
  const daysIn = fridge ? Math.max(0, Math.round((Date.parse(today) - Date.parse(fridge.added_on)) / 864e5)) : 0
  const check = cookCheck(r.groups, daysIn).slice(0, 5)
  const art = recipe.art && recipe.art.length ? recipe.art : []
  const st = standingOf(ratings, members)
  return (
    <>
      <div className="span-6 recipe-top"><Crumb to="/kitchen">Kitchen</Crumb></div>
      <UnicornGlow standing={st} slug={slug} title={r.title} today={today} className="span-6">
      <article className={'recipe-hero span-6' + (st.unicorn ? ' is-unicorn' : '')}>
        <RecipeArt names={art} />
        <div className="rh-t">
          <StandingBadge standing={st} />
          <h1>{r.title}</h1>
          <p className="rh-meta">
            {r.total != null && <span className="chip"><b>{timeWords(r.total)}</b>{r.handsOn != null && ` · ${timeWords(r.handsOn)} hands-on`}</span>}
            {r.serves && <span className="chip">Serves {r.serves}</span>}
            {easyOnHands(recipe.body) && <span className="chip easy">Easy on the hands</span>}
          </p>
          <div className="rh-actions">
            <Link className="btn" to={`/kitchen/recipe/${slug}/cook`}>Cook it ›</Link>
            {parent && (fridge
              ? <button type="button" className="btn ghost" onClick={async () => { await finishFridge(fridge.id, 'cooked', today); onChanged() }}>We cooked it</button>
              : <button type="button" className="btn ghost" onClick={async () => { await addToFridge(recipe.id, today); onChanged() }}>Add to this week</button>)}
          </div>
          {startBy && (
            <p className="start-by">
              <label>Dinner at <select value={dinner} onChange={(e) => update({ dinnerAt: e.target.value })}>{Array.from({ length: 17 }, (_, i) => 16 * 60 + 30 + i * 15).map((m) => <option key={m} value={`${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`}>{hhmm(m)}</option>)}</select></label>
              <span>start by <b>{startBy}</b></span>
            </p>
          )}
        </div>
      </article>
      </UnicornGlow>

      <Card tint="#F2C14E" label="Ratings" glyph="star" className="span-2 ratings-card">
        {['L', 'J', 'A'].map((k) => {
          const person = PEOPLE[k]
          const who = members.find((m) => m.name && m.name[0] === k)
          const row = who && ratings.find((x) => x.member_id === who.id)
          const member = me && who && me.id === who.id ? me : null // only your own row takes a tap
          const stars = row ? row.stars : 0
          return (
            <div key={k} className="rate-row" style={{ '--p': person.colour }}>
              <span className="who">{person.name}</span>
              <span className="stars" role={member ? 'radiogroup' : undefined} aria-label={`${person.name}’s rating`}>
                {[1, 2, 3, 4, 5].map((n) => member
                  ? <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} of 5`} className={n <= stars ? 'on' : ''} onClick={async () => { await rate(recipe.id, me.id, n); onChanged() }}>★</button>
                  : <span key={n} className={n <= stars ? 'on' : ''} aria-hidden="true">★</span>)}
                {!member && <span className="sr">{stars ? `${stars} of 5` : 'not yet'}</span>}
              </span>
            </div>
          )
        })}

      </Card>

      {plates.length > 0 && (
        <section className="plates span-4">
          {plates.map(([k, title, body]) => (
            <div key={k} className="plate" style={{ '--p': PEOPLE[k].colour }}>
              <h3>{title}</h3>
              <Prose text={body} />
            </div>
          ))}
        </section>
      )}

      {check.length > 0 && (
        <Card tint="#3E7A4C" label="Cook check" glyph="pot" tag={fridge ? (daysIn === 0 ? 'bought today' : `in the fridge ${daysIn} ${daysIn === 1 ? 'day' : 'days'}`) : undefined} className="span-6 cook-check">
          <p className="muted">The fresh things most likely to have turned, first. A quick look before you start:</p>
          <ul>
            {check.map((c) => (
              <li key={c.what} className={checked[c.what] || ''}>
                <span><b>{c.what}</b>{fridge && <span className={'left' + (c.left <= 0 ? ' due' : '')}> · {c.left <= 0 ? 'check it today' : `good about ${c.left} more ${c.left === 1 ? 'day' : 'days'}`}</span>}<br /><span className="muted">{c.tell}</span></span>
                <span className="cc-b">
                  <button type="button" aria-pressed={checked[c.what] === 'good'} onClick={() => setChecked({ ...checked, [c.what]: 'good' })}>Good</button>
                  <button type="button" aria-pressed={checked[c.what] === 'gone'} onClick={() => setChecked({ ...checked, [c.what]: 'gone' })}>Gone</button>
                </span>
              </li>
            ))}
          </ul>
          {check.every((c) => checked[c.what]) && <p className={check.some((c) => checked[c.what] === 'gone') ? 'nudge' : 'ok'}>{check.some((c) => checked[c.what] === 'gone') ? `Swap or pick up: ${check.filter((c) => checked[c.what] === 'gone').map((c) => c.what.toLowerCase()).join(', ')}.` : 'All good: cook it.'}</p>}
        </Card>
      )}

      <Card tint="#E0662F" label="Ingredients" glyph="pot" tag={`${r.groups.flat().filter((x) => got[x.text]).length} of ${r.groups.flat().length} out`} className="span-2 ingredients-card">
        {r.groups.map((g, gi) => (
          <div key={gi} className="ing-group">
            {names[gi] && <h3>{names[gi]}</h3>}
            <ul>
              {g.map((x) => (
                <li key={x.text}>
                  <label className={got[x.text] ? 'got' : ''}>
                    <input type="checkbox" checked={Boolean(got[x.text])} onChange={(e) => setGot({ ...got, [x.text]: e.target.checked })} />
                    <FoodIcon name={iconFor(x.item)} size={30} />
                    <span>{x.amount && <b className="amt">{x.amount}{x.unit ? ` ${x.unit}` : ''}</b>} {x.item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      <section className="steps span-4" aria-label="Steps">
        {r.steps.map((s) => (
          <div key={s.n} className="step">
            <span className="step-n">{s.n}</span>
            <div>
              {s.minutes != null && <button type="button" className="step-time" onClick={() => startTimer({ label: `Step ${s.n}: ${r.title}`, minutes: s.minutes, recipe: slug })} aria-label={`Start a ${s.time} timer for step ${s.n}`}>▶ {s.time}</button>}
              <p><Inline text={s.text} /></p>
            </div>
          </div>
        ))}
      </section>

      {rest.map((s) => (
        <Card key={s.name} tint={s.name === 'Why it works' ? '#3E7A4C' : '#B88A5A'} label={s.name} glyph={SECTION_ICON[s.name] || 'star'} className={'span-3 section-card' + (s.name === 'Why it works' ? ' why' : '')}>
          <Prose text={s.body} />
        </Card>
      ))}

      {parent && <div className="span-6 recipe-foot"><button type="button" className="btn ghost" onClick={() => setRemoving(true)}>Remove this recipe</button></div>}
      {removing && (
        <Confirm title={`Remove ${r.title}?`} yes="Remove it" danger onNo={() => setRemoving(false)}
          onYes={async () => { await removeRecipe(recipe.id); setRemoving(false); navigate('/kitchen', { replace: true }) }}>
          <p>Its ratings go with it. Opening the file from Obsidian again brings it back.</p>
        </Confirm>
      )}
      <Timers />
    </>
  )
}
