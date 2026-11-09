import { inline, stepParts } from '../lib/kitchen/recipe.js'

/**
 * Recipe words with their **bold** amounts, as text: never HTML. Given the recipe's ingredient
 * groups (a step), the ingredients it names are picked out too, with any amount it left plain.
 */
export function Inline({ text, groups }) {
  if (groups) {
    return stepParts(text, groups).map((p, i) => (p.bold || p.amount ? <b key={i} className="amt">{p.text}</b>
      : p.ingredient ? <b key={i} className="ing">{p.text}</b>
        : p.italic ? <i key={i}>{p.text}</i> : <span key={i}>{p.text}</span>))
  }
  return inline(text).map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : p.italic ? <i key={i}>{p.text}</i> : <span key={i}>{p.text}</span>))
}
/** A section's paragraphs and lists. */
export function Prose({ text }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return blocks.map((b, i) => {
    const lines = b.split('\n')
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*[-*•]\s+/, '')} /></li>)}</ul>
    return <p key={i}><Inline text={lines.join(' ')} /></p>
  })
}
