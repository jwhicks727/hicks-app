import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { tableQuestion } from '../lib/table.js'

// Evenings on Home: one question for the dinner table, the same for all of
// us tonight. "Another" if it doesn't land.
export default function TableCard({ today }) {
  const [n, setN] = useState(0)
  return (
    <Card tint="#F28C38" label="At the table tonight" glyph="star" className="span-3 table-card">
      <p className="table-q">{tableQuestion(today, n)}</p>
      <button type="button" className="btn ghost" onClick={() => setN(n + 1)}>Another</button>
    </Card>
  )
}
