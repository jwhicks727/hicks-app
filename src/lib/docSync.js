// ============================================
// docSync.js -- one sync of a journal with its Google Doc, in the browser
// ============================================
// What to do is worked out in journalDoc.js (pure, tested); this file does it:
// reads the Doc with the writer's own Google key, writes the Doc first (only
// if nobody has changed it since it was read), then saves here. It runs on
// the writer's device and nowhere else.

import { getDoc, editDoc, googleToken, GoogleError } from './google.js'
import { docParagraphs, docDays, docFormat, docHash, appHash, planSync, buildRequests, rowOf, aheadDue, combineDays, tooLong } from './journalDoc.js'
import { saveSynced, saveDocLink, removeEntry } from './useJournal.js'

export const SAVED = 'hicks:journal-saved'
/** The journal editor says a page was saved; a linked journal takes it to the Doc (DocBar). */
export const savedPage = () => window.dispatchEvent(new Event(SAVED))

/** The Doc, read and cut into days (with their fingerprints) and its way of writing a day. */
export async function readDoc(id, stop, token) {
  const doc = await getDoc(id, token)
  const paras = docParagraphs(doc)
  const dd = docDays(paras, stop || null)
  for (const d of dd.days) d.hash = await docHash(d)
  return { doc, paras, ...dd, f: docFormat(paras, dd.days) }
}

/** Read the Doc and compare it with the journal here, writing nothing: { r, plan }. */
export async function lookAt(j) {
  const s = j.settings || {}
  const token = googleToken()
  if (!token) throw new GoogleError('Sign in with Google to reach your Doc.', 'signin')
  const r = await readDoc(s.doc_id, s.doc_stop, token)
  if (r.missing) throw new GoogleError(`The app can’t find the line your days stop above (“${s.doc_stop}”), so it won’t guess. Choose it again.`, 'stop')
  const entries = await Promise.all(j.entries.map(async (e) => ({ ...e, now: await appHash(e) })))
  return { r, plan: planSync({ days: r.days, entries, removed: s.doc_removed || [] }) }
}

/** What waits for the writer, with the choices they've made so far taken out. */
export function waiting(plan, choices = {}) {
  if (!plan) return []
  return [
    ...plan.conflicts.map((c) => ({ kind: 'differ', date: c.day.date, ...c })),
    ...plan.goneFromDoc.map((g) => ({ kind: 'goneFromDoc', date: g.entry.on_date, ...g })),
    ...plan.removedHere.map((g) => ({ kind: 'removedHere', date: g.day.date, ...g })),
  ].filter((w) => !choices[w.date]).sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * Carry out the plan: what goes across by itself, and the writer's choices, { [date]: 'doc' | 'here' | 'both' |
 * 'remove' | 'restore' } ('both': the day combined, written to both sides). With "begin tomorrow ahead" on, tomorrow's page is begun in the Doc once today has
 * words. Returns { toDoc, here, removed }, the counts for the screen.
 */
export async function carryOut(j, me, { r, plan }, choices = {}, onStep = () => {}, today = null) {
  const s = j.settings || {}
  const token = googleToken()
  if (!token) throw new GoogleError('Sign in with Google to reach your Doc.', 'signin')
  const writes = [], pulls = [...plan.pull], prints = [], removeHere = [], settled = new Set(plan.clear || [])
  for (const { day, entry } of plan.push) writes.push({ type: 'replace', day, entry })
  for (const { entry } of plan.add) writes.push({ type: 'add', entry })
  for (const { day, entry } of plan.mark) prints.push({ on_date: entry.on_date, doc_hash: day.hash, app_hash: entry.now })
  for (const c of plan.conflicts) {
    const k = choices[c.day.date]
    if (k === 'doc' && c.empty) removeHere.push(c.entry) // emptied in the Doc, and the writer said remove it here too
    else if (k === 'doc' && !c.long) pulls.push(c)
    if (k === 'here' && !c.unsafe) writes.push({ type: 'replace', day: c.day, entry: c.entry })
    if (k === 'both' && !c.unsafe && !c.empty) {
      const raw = combineDays(c.day.entry, c.entry)
      const merged = tooLong(raw) ? null : rowOf({ ...raw, date: c.day.date }) // too long to keep whole: not combined
      if (merged) writes.push({ type: 'replace', day: c.day, entry: merged, combined: c.entry })
    }
  }
  for (const g of plan.goneFromDoc) {
    const k = choices[g.entry.on_date]
    if (k === 'remove') removeHere.push(g.entry)
    if (k === 'restore') writes.push({ type: 'add', entry: g.entry })
  }
  for (const g of plan.removedHere) {
    const k = choices[g.day.date]
    if (k === 'remove') writes.push({ type: 'delete', day: g.day })
    if (k === 'restore') pulls.push({ day: g.day, entry: null })
    if (k) settled.add(g.day.date)
  }

  // Tomorrow's page, begun ahead the way the writer does it
  if (s.doc_ahead && today) {
    const next = aheadDue({ days: r.days, entries: j.entries, today })
    if (next && !writes.some((w) => w.entry && w.entry.on_date === next)) writes.push({ type: 'add', entry: { on_date: next, skeleton: true } })
  }

  // The Doc first, and only as it was read: if it changed meanwhile, Google refuses and nothing is half-done
  let after = r
  if (writes.length) {
    onStep('Writing to your Doc…')
    await editDoc(s.doc_id, token, buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f: r.f, writes }), r.doc.revisionId)
    after = await readDoc(s.doc_id, s.doc_stop, token)
  }

  // Then here: whole days in one batch, fingerprints in another (a batch keeps one shape of row)
  onStep('Saving here…')
  const whole = []
  for (const { day, entry } of pulls) {
    const row = rowOf(day.entry)
    if (row) whole.push({ ...row, imported: entry ? Boolean(entry.imported) : true, doc_hash: day.hash, app_hash: await appHash(row) })
  }
  for (const w of writes) {
    if (w.type === 'delete' || w.entry.skeleton) continue
    const d = after.days.find((x) => x.date === w.entry.on_date)
    if (!d) continue
    // A combined day is new here too: the whole day is saved, not only its fingerprints
    if (w.combined) whole.push({ ...w.entry, imported: Boolean(w.combined.imported), doc_hash: d.hash, app_hash: await appHash(w.entry) })
    else prints.push({ on_date: w.entry.on_date, doc_hash: d.hash, app_hash: w.entry.now || (await appHash(w.entry)) })
  }
  let res = await saveSynced(whole)
  if (!res.error) res = await saveSynced(prints)
  if (res.error) throw new GoogleError(res.error.message, 'here')
  for (const e of removeHere) {
    const { error } = await removeEntry(e.id)
    if (error) throw new GoogleError(error.message, 'here')
  }
  const left = (s.doc_removed || []).filter((d) => !settled.has(d))
  const link = await saveDocLink({ doc_synced_at: new Date().toISOString(), doc_removed: left }, me)
  if (link.error) throw new GoogleError(link.error.message, 'here')
  return { toDoc: writes.filter((w) => w.type !== 'delete' && !w.entry.skeleton).length, begun: writes.some((w) => w.entry && w.entry.skeleton), here: whole.length, removed: removeHere.length + writes.filter((w) => w.type === 'delete').length }
}
