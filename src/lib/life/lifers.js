// ============================================
// lifers.js -- birds reported where we are that aren't on Laurie's life list
// ============================================
// Pure: tests/birds-near.test.mjs. Worked out on the device from her own
// sightings (bird_sightings, parents only), which never leave it. eBird and her
// file share a taxonomy, so a bird is matched by its scientific name (its first
// two words, so a subspecies group still matches), else its common name.

import { slug } from './birdStats.js'

const notSpecies = (name) => /\bsp\.|\/|\bx\b|\(hybrid\)|\bslash\b|\bDomestic\b/i.test(String(name || ''))
const binomialKey = (sci) => slug(String(sci || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').trim().split(/\s+/).slice(0, 2).join(' '))

/**
 * Birds in this week's list near here that she has never recorded: the
 * notable ones first, then the most reported. Empty when her list is empty
 * (nothing to compare with), so it never claims every bird is new.
 */
export function possibleLifers(species, rows, n = 8) {
  if (!rows || !rows.length || !species || !species.length) return []
  const seen = new Set()
  for (const r of rows) {
    if (notSpecies(r.species)) continue
    if (r.sci_name) seen.add(binomialKey(r.sci_name))
    seen.add('c:' + slug(r.species))
  }
  return species
    .filter((b) => b && b.name && !notSpecies(b.name) && !seen.has(binomialKey(b.sci)) && !seen.has('c:' + slug(b.name)))
    .sort((a, b) => (Number(Boolean(b.notable)) - Number(Boolean(a.notable))) || ((b.reports || 0) - (a.reports || 0)) || String(b.last || '').localeCompare(String(a.last || '')))
    .slice(0, n)
}
