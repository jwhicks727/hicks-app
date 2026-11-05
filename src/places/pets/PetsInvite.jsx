import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '../../shell/Link.jsx'
import { reducedMotion } from '../../lib/motion.js'
import { readInvite, inviteDue, markShown, markDone, petsOpened, catFor, CAT_NAMES } from '../../lib/petsInvite.js'
import CatFace, { CatPaws } from './CatFace.jsx'
import './pets-invite.css'

const WAIT = 1800 // after Home has settled
const STAY = 20000 // then back down, asked again another day
const LEAVE = 450

/**
 * One of Anna's cats peeks up from behind the tab bar, just over Apps, and says Pets is new
 * (src/lib/petsInvite.js says when). On a computer it peeks up from the bottom of the window instead.
 * The cat and its words both open Pets; × waves it away for good. Drawn at the top of the page (a
 * portal), above the tab bar's edge, where the paws hold on to it. Under less motion it simply appears.
 */
export default function PetsInvite({ today }) {
  const [stage, setStage] = useState('waiting') // waiting → up → leaving → gone
  useEffect(() => {
    if (!inviteDue(readInvite(localStorage), today, petsOpened(localStorage))) return undefined
    const t = setTimeout(() => { markShown(localStorage, today); setStage('up') }, WAIT)
    return () => clearTimeout(t)
  }, [today])
  useEffect(() => {
    if (stage !== 'up' && stage !== 'leaving') return undefined
    const t = setTimeout(() => setStage(stage === 'up' ? 'leaving' : 'gone'), stage === 'up' ? STAY : LEAVE)
    return () => clearTimeout(t)
  }, [stage])
  if (stage === 'waiting' || stage === 'gone') return null
  const cat = catFor(today)
  const name = CAT_NAMES[cat]
  const answered = () => markDone(localStorage)
  const away = () => { markDone(localStorage); setStage('leaving') }
  return createPortal(
    <aside className={'pi pi-' + cat + (stage === 'leaving' ? ' pi-out' : '') + (reducedMotion() ? ' pi-still' : '')} aria-label="New: Pets">
      <div className="pi-window">
        <Link to="/pets" className="pi-cat" tabIndex={-1} aria-hidden="true" onClickCapture={answered}>
          <svg viewBox="0 0 100 100" focusable="false"><CatFace look={cat} /></svg>
        </Link>
      </div>
      <svg className="pi-paws" viewBox="0 0 64 16" aria-hidden="true" focusable="false"><CatPaws look={cat} /></svg>
      <div className="pi-bubble">
        <Link to="/pets" className="pi-say" onClickCapture={answered}>
          <b>Psst! It’s {name}.</b>
          <span>Pets is new in Apps. Come and meet us ›</span>
        </Link>
        <button type="button" className="pi-x" aria-label="Not now" onClick={away}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </aside>,
    document.body,
  )
}
