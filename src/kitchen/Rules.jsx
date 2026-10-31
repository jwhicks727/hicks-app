import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb } from '../shell/Link.jsx'
import { useSession } from '../lib/auth.js'
import { useDraft } from '../lib/useDraft.js'
import { usePreferences, useFoodRules, useConsents, savePreferences, saveFoodRules, sayConsent } from '../lib/useKitchenPlan.js'

const when = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const STARTER = `Store: Trader Joe's, mostly.
Equipment: slow cooker, Instant Pot, convection oven, broiler, sheet pans.
Jason's hands: some weeks they're sore; then lean on the sheet pan, slow cooker, pre-cut and frozen produce, scissors over knives.
Anna: adventurous and fickle; nuggets in the freezer for a miss.
Dislikes (none of these, ever):
Loved lately:
Not again for a while:
In the pantry now:`

/**
 * /kitchen/rules: what the Kitchen (and Claude, when it plans) goes by. The
 * kitchen's preferences, which the family reads and the parents change; and
 * Laurie's food rules, which only Jason and Laurie see, and which go to
 * Claude only while her own switch here says yes. Every change is a new
 * version; the old ones stay.
 */
export default function Rules({ parent, me, members }) {
  const session = useSession()
  const prefs = usePreferences(session), rules = useFoodRules(session), consents = useConsents(session)
  const laurie = members.find((m) => m.name === 'Laurie') || null
  const owner = rules.rows[0] ? members.find((m) => m.id === rules.rows[0].belongs_to) : laurie
  const yes = owner ? consents.rows.find((c) => c.member_id === owner.id) : null
  return (
    <>
      <header className="hero span-6"><Crumb to="/kitchen">Kitchen</Crumb><span className="kicker">Kitchen</span><h1 className="greet">Rules &amp; preferences</h1></header>
      <Versioned
        title="The kitchen’s preferences" tint="#E0662F" rows={prefs.rows} canEdit={parent} starter={STARTER} draftKey="kitchen.prefs.edit"
        about="Tastes, dislikes, what’s loved lately, the pantry, the equipment: what Claude goes by when it plans and talks. The family can read it; Jason and Laurie change it. Each change is kept."
        onSave={async (body, note) => { const r = await savePreferences(body, note, me); prefs.reload(); return r }}
      />
      {parent && (
        <Versioned
          title={`${owner ? owner.name : 'Laurie'}’s food rules`} tint="#B3263A" rows={rules.rows} canEdit draftKey="kitchen.rules.edit" private
          about="Health information: only Jason and Laurie can read these. Every dinner’s core satisfies them. Each change is a new version, dated, and the old ones are kept."
          onSave={async (body, note) => { const r = await saveFoodRules((owner || me).id, body, note, me); rules.reload(); return r }}
        >
          <div className={'consent ' + (yes && yes.granted ? 'on' : 'off')}>
            {me && owner && me.id === owner.id ? (
              <div className="switch-row">
                <span><b>Let Claude read my rules when we plan</b><span>{yes && yes.granted ? `Yes, since ${when(yes.at)}. They go to Claude (Anthropic) only when Jason or you plan the week, write recipes or ask in the Kitchen chat. Switch it off any time.` : 'Off: Claude plans without them, and says so. They would go to Anthropic only when Jason or you ask it to plan.'}</span></span>
                <button type="button" className="switch" role="switch" aria-checked={Boolean(yes && yes.granted)} aria-label="Let Claude read my rules" onClick={async () => { await sayConsent(me, !(yes && yes.granted)); consents.reload() }}><i /></button>
              </div>
            ) : (
              <p className="muted">{yes && yes.granted ? `${owner ? owner.name : 'Laurie'} said yes on ${when(yes.at)}: Claude reads these when you plan.` : `${owner ? owner.name : 'Laurie'} hasn’t said yes, so Claude plans without these. It’s her switch, here, when she signs in.`}</p>
            )}
          </div>
        </Versioned>
      )}
    </>
  )
}

/** A text kept in versions: the latest shown, a new one written, the old ones a tap away. */
function Versioned({ title, tint, rows, canEdit, about, starter = '', draftKey, onSave, children, private: secret = false }) {
  const latest = rows[0] || null
  const [edit, setEdit, clear] = useDraft(draftKey, null)
  const [err, setErr] = useState(null)
  const start = () => setEdit({ body: latest ? latest.body : starter, note: '' })
  async function save() {
    if (!edit.body.trim()) return
    const { error } = await onSave(edit.body.trim(), edit.note.trim())
    if (error) setErr(error.message); else { clear(); setErr(null) }
  }
  return (
    <Card tint={tint} label={title} glyph={secret ? 'candle' : 'pot'} tag={latest ? `v${rows.length} · ${when(latest.created_at)}` : undefined} className="span-3">
      <p className="muted">{about}</p>
      {children}
      {!edit && (latest ? <div className="versioned">{latest.body}</div> : <p className="muted">Nothing saved yet. {secret ? 'Type or paste them here: they stay in the database, and only go to Claude with her yes.' : 'This is kept in the database, not in the app’s code, so it starts empty: write it fresh, or paste what you had from before, and every plan and every chat will go by it.'}</p>)}
      {edit && (
        <div className="form">
          <label>{latest ? 'The new version' : 'The first version'}<textarea rows={10} maxLength={20000} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></label>
          <label>What changed (a few words)<input maxLength={500} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Added: no more cauliflower rice" /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="form-actions"><button type="button" className="btn" onClick={save}>Save as a new version</button><button type="button" className="btn ghost" onClick={clear}>Cancel</button></div>
        </div>
      )}
      {canEdit && !edit && <button type="button" className="btn ghost" onClick={start}>{latest ? 'Change it' : 'Write it'}</button>}
      {rows.length > 1 && (
        <details className="history">
          <summary>Earlier versions ({rows.length - 1})</summary>
          {rows.slice(1).map((r) => <details key={r.id}><summary>{when(r.created_at)}{r.note ? ` · ${r.note}` : ''}</summary><div className="versioned">{r.body}</div></details>)}
        </details>
      )}
    </Card>
  )
}
