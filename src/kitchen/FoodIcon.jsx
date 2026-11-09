import { colourFor, secondFor } from '../lib/kitchen/food.js'

const INK = '#3B2B22'
/**
 * An ingredient's drawing, coloured in to its own outline (Food Icon Pack, CC BY 4.0): its colour under
 * the line drawing, and for a drawing with stems or leaves (a carrot's top) their own colour too.
 */
export function FoodIcon({ name, size = 28, colour, className = '' }) {
  if (!name) return <span className={'food-icon none ' + className} style={{ width: size, height: size }} aria-hidden="true" />
  const href = `/food/${name}.svg`
  const second = secondFor(name)
  return (
    <svg className={'food-icon ' + className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <use href={`${href}#fill`} width="100" height="100" fill={colour || colourFor(name)} />
      {second && <use href={`${href}#fill2`} width="100" height="100" fill={second} />}
      <use href={`${href}#ink`} width="100" height="100" fill={INK} />
    </svg>
  )
}

/** A recipe's art: its main ingredients, the first a little larger, on a warm round. */
export function RecipeArt({ names, size = 'large' }) {
  const [a, b, c] = names
  if (!a) return null // nothing to draw: no empty shadow
  return (
    <div className={'recipe-art ' + size} aria-hidden="true">
      {b && <FoodIcon name={b} size={size === 'large' ? 74 : 40} className="ra-b" />}
      {a && <FoodIcon name={a} size={size === 'large' ? 104 : 56} className="ra-a" />}
      {c && <FoodIcon name={c} size={size === 'large' ? 74 : 40} className="ra-c" />}
    </div>
  )
}
