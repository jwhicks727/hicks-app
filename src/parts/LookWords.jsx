import { MOODS, STYLES, WEATHERS, cleanLooks } from '../lib/gallery.js'

/**
 * What Claude saw in a piece (Laurie's or Anna's), as words to keep with it for finding it on its wall and for the
 * featured wall: each one taken off with a tap, since Claude's words are only ever suggestions until someone keeps them.
 * `what` names the wall ("her gallery", "her wall").
 */
export default function LookWords({ looks, onChange, what = 'her gallery' }) {
  if (!looks) return null
  const words = [
    ...(looks.subjects || []).map((w) => ['subjects', w, w]),
    ...(looks.moods || []).map((w) => ['moods', w, (MOODS[w] || w).toLowerCase()]),
    ...(looks.style ? [['style', looks.style, (STYLES[looks.style] || looks.style).toLowerCase()]] : []),
    ...(looks.weather ? [['weather', looks.weather, (WEATHERS[looks.weather] || looks.weather).toLowerCase()]] : []),
  ]
  if (!words.length) return null
  const drop = (k, w) => onChange(cleanLooks({ ...looks, [k]: Array.isArray(looks[k]) ? looks[k].filter((x) => x !== w) : '' }))
  return (
    <div className="ll-looks">
      <span className="ll-looks-head">What Claude sees in it, for finding it on {what} (tap one that’s wrong):</span>
      <span className="ll-looks-row">{words.map(([k, w, label]) => <button key={k + w} type="button" className="ll-look" onClick={() => drop(k, w)} aria-label={`Take “${label}” off`}>{label} <span aria-hidden="true">×</span></button>)}</span>
    </div>
  )
}
