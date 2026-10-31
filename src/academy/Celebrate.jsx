import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { reducedMotion } from '../lib/motion.js'
import { itemSrc } from './items.js'

// A moment of joy: confetti in the school's colours and a card saying what
// she did. A tap anywhere, or a few seconds, puts it away. With less motion
// asked for, the card alone.
const COLOURS = ['#F2C14E', '#3FA34D', '#E8546B', '#4A7FD6', '#8A5BC4', '#FFFFFF', '#F28C38']

export default function Celebrate({ moment, onDone, colours = [] }) {
  useEffect(() => {
    if (!moment) return undefined
    const t = setTimeout(onDone, moment.long ? 5200 : 3400)
    return () => clearTimeout(t)
  }, [moment, onDone])
  if (!moment) return null
  const calm = reducedMotion()
  const palette = [...colours, ...COLOURS]
  return createPortal(
    <div className="ac-joy" onClick={onDone} role="status" aria-live="polite">
      {!calm && Array.from({ length: moment.big ? 90 : 44 }, (_, k) => (
        <i key={k} style={{ '--x': `${(k * 37) % 100}vw`, '--d': `${1.6 + ((k * 13) % 17) / 10}s`, '--w': `${(k * 7) % 5 - 2}`, '--delay': `${((k * 11) % 9) / 20}s`, background: palette[k % palette.length], borderRadius: k % 3 ? '1px' : '50%' }} />
      ))}
      <div className="ac-joy-card">
        {moment.prize && <img src={moment.prize.startsWith('http') ? moment.prize : itemSrc(moment.prize)} alt="" width="72" height="72" />}
        <b>{moment.title}</b>
        {moment.line && <span>{moment.line}</span>}
      </div>
    </div>,
    document.body,
  )
}
