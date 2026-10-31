import { inline } from '../lib/kitchen/recipe.js'

/** Recipe words with their **bold** amounts, as text: never HTML. */
export function Inline({ text }) {
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
