import { Card } from '../ui/Card.jsx'
import { useSession } from '../lib/auth.js'
import { useFamily } from '../lib/useCalendar.js'
import { useDraft } from '../lib/useDraft.js'
import { useTravelSettings } from '../lib/useAround.js'
import { DEFAULT_INTERESTS } from '../../supabase/functions/_shared/around.js'
import { useState } from 'react'

/**
 * Admin › What's around here: what the guide is written for. The parents keep it;
 * the family can read it; it's sent to Claude with the town and the area whenever a
 * guide is written (the card and Settings say so).
 */
export default function AroundSetup() {
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const { interests, loaded, save } = useTravelSettings()
  const [draft, setDraft, clear] = useDraft('around.interests', { text: '' })
  const [note, setNote] = useState('')
  const shown = draft.text || interests || ''
  return (
    <Card tint="#B5658F" label="What’s around here: what the guide is written for" glyph="star" className="span-6">
      <p>Away from home, a guide to the place writes itself. This is what it’s written for, and it’s sent to Claude with the town and the area (to about ten kilometres) each time a guide is written. Never anyone’s whereabouts, and never a word from a journal or a list.</p>
      {!loaded && <p className="muted">Reading…</p>}
      {loaded && !parent && <p><b>Now:</b> {interests || DEFAULT_INTERESTS}</p>}
      {loaded && parent && (
        <form className="form" onSubmit={async (e) => {
          e.preventDefault()
          const why = await save(shown.trim(), me && me.id)
          setNote(why ? `Not saved: ${why}` : 'Saved. The next guide is written for this.')
          if (!why) clear()
        }}>
          <label htmlFor="around-interests"><b>The family’s interests</b><span>A short paragraph: what each of us loves on a trip, and Anna’s too. Empty means the starting words below.</span></label>
          <textarea id="around-interests" rows={5} maxLength={1500} value={shown} placeholder={DEFAULT_INTERESTS} onChange={(e) => setDraft({ text: e.target.value })} />
          <div className="form-actions">
            <button type="submit" className="btn">Save</button>
            {draft.text && <button type="button" className="btn ghost" onClick={() => clear()}>Cancel</button>}
          </div>
          {note && <p className="muted" role="status">{note}</p>}
        </form>
      )}
      <p className="muted small">Starting words: {DEFAULT_INTERESTS}</p>
    </Card>
  )
}
