import { TWINKLE } from '../lib/tapes.js'
import './tape.css'

/**
 * A strip of washi tape (src/lib/tapes.js), drawn in code. Where it sits and how big it is come from `className`
 * (each place sets the strip's size, and its font-size to the strip's height, so the pattern scales with it). A
 * glitter tape twinkles, opacity only, and is still under less motion. With `onClick` it's a button (its label is
 * `label`); otherwise it's decoration, hidden from screen readers.
 */
export default function Tape({ tape, className = '', onClick, label, style }) {
  if (!tape) return null
  const cls = `tape ${className}${tape.glitter ? ' tape-glitter' : ''}`
  const s = { ...style, background: tape.bg, ...(tape.glitter ? { '--tw': TWINKLE } : null) }
  if (onClick) return <button type="button" className={cls} style={s} data-tape={tape.id} onClick={onClick} aria-label={label}>{null}</button>
  return <span className={cls} style={s} data-tape={tape.id} aria-hidden="true" />
}
