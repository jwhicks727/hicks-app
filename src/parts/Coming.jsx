import { Card } from '../ui/Card.jsx'

/** What a place is getting next: honest, never stand-in numbers. */
export default function Coming({ tint, glyph, title, items, className = 'span-3' }) {
  return (
    <Card tint={tint} glyph={glyph} label={title} tag="Being built" className={className}>
      <ul className="coming">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </Card>
  )
}
