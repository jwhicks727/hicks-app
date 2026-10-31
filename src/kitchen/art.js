import { parseRecipe } from '../lib/kitchen/recipe.js'
export const parsedCache = new Map()
export function parsed(body) {
  if (!parsedCache.has(body)) parsedCache.set(body, parseRecipe(body))
  return parsedCache.get(body)
}
export const timeWords = (m) => (m == null ? '' : m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`)
export const PEOPLE = { L: { name: 'Laurie', colour: '#8A5BC4' }, J: { name: 'Jason', colour: '#4A7FD6' }, A: { name: 'Anna', colour: '#E85D9A' } }
