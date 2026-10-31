// ============================================
// birdWords.js -- the week's birds, in words and links for the screen
// ============================================
// The sightings come from the `birds` Edge Function (supabase/functions/_shared/birds.js).

/** "today", "yesterday", "3 days ago", from eBird's local "YYYY-MM-DD HH:mm" and today's date at home. */
export function seenWhen(obsDt, today) {
  const d = String(obsDt || '').slice(0, 10)
  if (!d) return ''
  const days = Math.round((Date.UTC(...today.split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0))) - Date.UTC(...d.split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0)))) / 864e5)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

export const ebirdSpeciesUrl = (code) => `https://ebird.org/species/${encodeURIComponent(code)}`
export const ebirdChecklistUrl = (id) => `https://ebird.org/checklist/${encodeURIComponent(id)}`
