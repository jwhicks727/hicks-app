// ============================================
// photos.js -- the trip photo reel: which photos belong where, and what's in them
// ============================================
// Pure, so tests/photos.test.mjs runs it in Node. A photo belongs to a town and a
// day; a recap or a kept trip's scrapbook gathers the photos of its town between its
// dates. Claude's tags (supabase/functions/_shared/claude.js, photoTagsAsk) arrive
// as suggestions; they count only once someone confirms them, and a confirmed dish
// or place can be linked to a recipe or to the town's list so the photo turns up
// there later. A confirmed plant, bird or animal turns up in the Garden, on the bird's
// page in the Life List, and so on. Nothing here names a person.

import { norm } from './been.js'

export const KINDS = { plant: 'Plants', bird: 'Birds', animal: 'Animals', dish: 'Dishes', place: 'Places', other: 'Other' }
export const KIND_ONE = { plant: 'Plant', bird: 'Bird', animal: 'Animal', dish: 'Dish', place: 'Place', other: 'Other' }
export const KIND_ORDER = ['plant', 'bird', 'animal', 'dish', 'place', 'other']
export const MAX_PER_BATCH = 24

/** Where a photo's files live in the private `trips` bucket. */
export const photoPaths = (id) => ({ path: `photos/${id}.jpg`, thumb_path: `photos/${id}.thumb.jpg` })

const pad = (n) => String(n).padStart(2, '0')
/**
 * The day a photo was taken: its file's own date when that falls inside the stay (a phone
 * stamps it), else the stay's last day, so a photo added later still lands on the trip.
 */
export function takenOn(lastModified, from, last) {
  const d = typeof lastModified === 'number' && Number.isFinite(lastModified) ? new Date(lastModified) : null
  if (!d) return last
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return day >= from && day <= last ? day : last
}

/** The reel for a stay or trip: photos of that town between its first and last day, newest first. */
export function photosFor(photos, { town, from, last }) {
  return (photos || []).filter((p) => norm(p.town) === norm(town) && p.taken_on >= from && p.taken_on <= last)
    .slice().sort((a, b) => (a.taken_on < b.taken_on ? 1 : a.taken_on > b.taken_on ? -1 : String(b.created_at || '').localeCompare(String(a.created_at || ''))))
}
export function tagsByPhoto(tags) {
  const m = new Map()
  for (const t of tags || []) { const a = m.get(t.photo_id) || []; a.push(t); m.set(t.photo_id, a) }
  for (const a of m.values()) a.sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || x.name.localeCompare(y.name))
  return m
}
export const suggestedIn = (tags) => (tags || []).filter((t) => t.status === 'suggested')

/**
 * Claude's cleaned answer as rows to keep, all `suggested`: a dish matched to one of the family's recipes
 * is linked to it, and a place matched to one on the town's list is linked to that. ctx: { recipes: [{ id, title }], places: [{ id, name }] }.
 */
export function suggestionRows(photoId, answer, ctx = {}) {
  const rows = []
  for (const s of (answer && Array.isArray(answer.subjects) ? answer.subjects : [])) {
    let ref_kind = null, ref_id = null
    if (s.kind === 'dish' && s.match) { const r = (ctx.recipes || []).find((x) => x.title === s.match); if (r) { ref_kind = 'recipe'; ref_id = r.id } }
    if (s.kind === 'place' && s.match) { const p = (ctx.places || []).find((x) => x.name === s.match); if (p) { ref_kind = 'been_place'; ref_id = p.id } }
    rows.push({ photo_id: photoId, kind: s.kind, name: s.name, sci: s.scientific || null, confidence: s.confidence || null, status: 'suggested', ref_kind, ref_id, by_ai: true })
  }
  return rows
}

/** A tag typed by hand: checked, and confirmed (someone chose it). Null for nonsense. */
export function handTag(photoId, { kind, name, ref_kind = null, ref_id = null }) {
  const n = String(name || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  if (!n || !KINDS[kind]) return null
  return { photo_id: photoId, kind, name: n, sci: null, confidence: null, status: 'confirmed', ref_kind, ref_id, by_ai: false }
}

/** The confirmed tags that belong at a place in the app: { refKind, refId } or { kind, names } (a bird's or plant's names). */
export function photosAt(photos, tags, spec) {
  const confirmed = (tags || []).filter((t) => t.status === 'confirmed')
  const names = spec.names ? spec.names.filter(Boolean).map(norm) : null
  const hit = confirmed.filter((t) => (spec.refKind ? t.ref_kind === spec.refKind && t.ref_id === spec.refId : t.kind === spec.kind && names && names.includes(norm(t.name))))
  const ids = [...new Set(hit.map((t) => t.photo_id))]
  const by = new Map((photos || []).map((p) => [p.id, p]))
  return ids.map((id) => by.get(id)).filter(Boolean).sort((a, b) => (a.taken_on < b.taken_on ? 1 : -1))
}

/** The plants we've photographed on trips, by name: [{ name, sci, photos, towns }], most photographed first. */
export function seenPlants(photos, tags) {
  const by = new Map(), pm = new Map((photos || []).map((p) => [p.id, p]))
  for (const t of tags || []) {
    if (t.kind !== 'plant' || t.status !== 'confirmed' || !pm.has(t.photo_id)) continue
    const k = norm(t.name), e = by.get(k) || { name: t.name, sci: t.sci || null, photos: [], towns: new Set() }
    e.photos.push(pm.get(t.photo_id)); e.towns.add(pm.get(t.photo_id).town); if (!e.sci && t.sci) e.sci = t.sci
    by.set(k, e)
  }
  return [...by.values()].map((e) => ({ ...e, towns: [...e.towns] })).sort((a, b) => b.photos.length - a.photos.length || a.name.localeCompare(b.name))
}

/** "6 photos · 4 tags to check" */
export function reelWords(list, tagMap) {
  const n = list.length
  if (!n) return ''
  const waiting = list.reduce((a, p) => a + suggestedIn(tagMap.get(p.id)).length, 0)
  return `${n} ${n === 1 ? 'photo' : 'photos'}${waiting ? ` · ${waiting} ${waiting === 1 ? 'tag' : 'tags'} to check` : ''}`
}
