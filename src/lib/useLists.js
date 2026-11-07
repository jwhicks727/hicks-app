import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { addDays } from './cal/dates.js'
import { dayList, daySummary, goldenKey, tickFor, entryKey, dayMarks, streakFrom } from './routines.js'
import { catalogue, planNext, standing } from './challenges.js'

// ============================================
// useLists -- one person's morning and evening lists, and the family's days
// ============================================
// Reads a person's items, their changes from a week back on, the day's ticks,
// every day they've kept (for streaks and records) and the family's last
// two months of days (counts only: for the family glance and the challenges).
// Ticking is shown at once and written after; each change rewrites the day's
// summary in `routine_days`, which is all the family (and the challenges) see.
// `memberId` is the person's one id (src/lib/cal/people.js).

const SELECT_ITEM = 'id, member_id, part, title, icon, weekdays, every_weeks, school, turns, starts_on, ends_on, sort, archived_on, created_at'
const SELECT_DAY = 'member_id, on_date, part, status, total, done, first_at, done_at, golden, streak, best'
const missingTable = (e) => e && /relation .* does not exist|schema cache|Could not find the table/i.test(e.message || '')

export function useLists(session, { memberId, today, schoolDay, withFamily = true } = {}) {
  const [s, setS] = useState({ loaded: false, error: null, missing: false, items: [], changes: [], ticks: [], myRows: [], familyRows: [], settings: null, overrides: [], runs: [] })
  const [n, setN] = useState(0)
  const reload = useCallback(() => setN((x) => x + 1), [])
  const live = useRef(true)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  // The latest state, read synchronously: a second tap before React re-renders sees the first one's tick
  const cur = useRef(s)
  cur.current = s
  const change = (fn) => { cur.current = fn(cur.current); setS(fn) }

  useEffect(() => {
    let on = true
    if (!supabase || !session || !memberId || !today) return undefined
    const from = addDays(today, -7)
    Promise.all([
      fetchAll(() => supabase.from('routine_items').select(SELECT_ITEM).eq('member_id', memberId).order('sort').order('created_at')),
      supabase.from('routine_changes').select('id, member_id, on_date, part, kind, item_id, title, note').eq('member_id', memberId).gte('on_date', from).limit(1000),
      supabase.from('routine_ticks').select('id, member_id, on_date, part, item_id, change_id, done_at').eq('member_id', memberId).gte('on_date', addDays(today, -1)).lte('on_date', today).limit(1000),
      fetchAll(() => supabase.from('routine_days').select(SELECT_DAY).eq('member_id', memberId).order('on_date').order('part')),
      withFamily ? fetchAll(() => supabase.from('routine_days').select(SELECT_DAY).gte('on_date', addDays(today, -60)).order('on_date').order('member_id').order('part')) : Promise.resolve({ data: [] }),
      supabase.from('routine_settings').select('names, challenges_on, pace').eq('id', true).maybeSingle(),
      supabase.from('family_challenges').select('*'),
      supabase.from('challenge_runs').select('*').order('starts_on'),
    ]).then((res) => {
      if (!on) return
      const err = res.map((r) => r.error).find(Boolean)
      setS({
        loaded: true, error: err ? err.message : null, missing: missingTable(err),
        items: res[0].data || [], changes: res[1].data || [], ticks: res[2].data || [], myRows: res[3].data || [], familyRows: res[4].data || [],
        settings: res[5].data || { names: 'birds', challenges_on: true, pace: 'regular' }, overrides: res[6].data || [], runs: res[7].data || [],
      })
    })
    return () => { on = false }
  }, [session, memberId, today, withFamily, n])

  // ---- The day's summary, kept in routine_days ----
  const writeDay = useCallback(async (date, part, items, changes, ticks) => {
    const list = dayList({ items, changes, date, part, schoolDay })
    const sum = daySummary(list, ticks.filter((t) => t.on_date === date && t.part === part))
    const gold = goldenKey(memberId, date, part, list.entries)
    const golden = Boolean(gold && list.entries.some((e) => entryKey(e) === gold && tickFor(e, ticks.filter((t) => t.on_date === date))))
    const row = { member_id: memberId, on_date: date, part, ...sum, golden }
    // The streak through this day, for the family's eyes (they can't see the list itself)
    const s = streakFrom(dayMarks({ rows: upsertRow(cur.current.myRows, row), items, part, today: date }))
    row.streak = s.current; row.best = s.best
    change((x) => ({ ...x, myRows: upsertRow(x.myRows, row), familyRows: upsertRow(x.familyRows, row) }))
    const { error } = await supabase.from('routine_days').upsert(row, { onConflict: 'member_id,on_date,part' })
    if (error && live.current) setS((x) => ({ ...x, error: error.message }))
    return row
  }, [memberId, schoolDay])

  // Today's summaries follow the list: an item added, taken off or changed changes the day's total.
  useEffect(() => {
    if (!s.loaded || s.error || !today) return
    for (const part of ['morning', 'evening']) {
      const list = dayList({ items: s.items, changes: s.changes, date: today, part, schoolDay })
      const sum = daySummary(list, s.ticks.filter((t) => t.on_date === today && t.part === part))
      const have = s.myRows.find((r) => r.on_date === today && r.part === part)
      if (!have && !sum.total && sum.status !== 'rest') continue
      if (!have || have.status !== sum.status || have.total !== sum.total || have.done !== sum.done) writeDay(today, part, s.items, s.changes, s.ticks)
    }
  }, [s.loaded, s.items, s.changes, today]) // eslint-disable-line react-hooks/exhaustive-deps -- ticks write their own day

  // ---- Ticks ----
  const tick = useCallback(async (entry, part, date = today) => {
    const temp = { id: 'tmp-' + entryKey(entry) + date, member_id: memberId, on_date: date, part, item_id: entry.kind === 'item' ? entry.id : null, change_id: entry.kind === 'extra' ? entry.id : null, done_at: new Date().toISOString() }
    change((x) => ({ ...x, ticks: [...x.ticks, temp] }))
    const next = cur.current
    const row = await writeDay(date, part, next.items, next.changes, next.ticks)
    const { data, error } = await supabase.from('routine_ticks').insert({ member_id: memberId, on_date: date, part, item_id: temp.item_id, change_id: temp.change_id }).select('id, member_id, on_date, part, item_id, change_id, done_at').single()
    if (!live.current) return row
    if (error && error.code !== '23505') { change((x) => ({ ...x, error: error.message, ticks: x.ticks.filter((t) => t.id !== temp.id) })); return null }
    if (data) change((x) => ({ ...x, ticks: x.ticks.map((t) => (t.id === temp.id ? data : t)) }))
    return row
  }, [memberId, today, writeDay])

  const untick = useCallback(async (entry, part, date = today) => {
    change((x) => ({ ...x, ticks: x.ticks.filter((t) => !(t.on_date === date && (entry.kind === 'extra' ? t.change_id === entry.id : t.item_id === entry.id))) }))
    const next = cur.current
    const q = supabase.from('routine_ticks').delete().eq('member_id', memberId).eq('on_date', date)
    const { error } = await (entry.kind === 'extra' ? q.eq('change_id', entry.id) : q.eq('item_id', entry.id))
    if (error && live.current) setS((x) => ({ ...x, error: error.message }))
    return writeDay(date, part, next.items, next.changes, next.ticks)
  }, [memberId, today, writeDay])

  // ---- Items ----
  const saveItem = useCallback(async (row, id) => {
    const q = id ? supabase.from('routine_items').update(row).eq('id', id).eq('member_id', memberId)
      : supabase.from('routine_items').insert({ ...row, member_id: memberId })
    const { error } = await q
    if (error) return error.message
    reload(); return null
  }, [memberId, reload])
  const setArchived = useCallback(async (id, on) => {
    change((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, archived_on: on } : i)) }))
    const { error } = await supabase.from('routine_items').update({ archived_on: on }).eq('id', id).eq('member_id', memberId)
    if (error && live.current) setS((x) => ({ ...x, error: error.message }))
  }, [memberId])
  const move = useCallback(async (part, id, dir) => {
    const list = cur.current.items.filter((i) => i.part === part && !i.archived_on).sort((a, b) => a.sort - b.sort || String(a.created_at).localeCompare(String(b.created_at)))
    const k = list.findIndex((i) => i.id === id), j = k + dir
    if (k < 0 || j < 0 || j >= list.length) return
    const order = [...list]; [order[k], order[j]] = [order[j], order[k]]
    const sorts = new Map(order.map((it, i) => [it.id, (i + 1) * 10]))
    change((x) => ({ ...x, items: x.items.map((i) => (sorts.has(i.id) ? { ...i, sort: sorts.get(i.id) } : i)) }))
    await Promise.all(order.filter((it) => it.sort !== sorts.get(it.id)).map((it) => supabase.from('routine_items').update({ sort: sorts.get(it.id) }).eq('id', it.id).eq('member_id', memberId)))
  }, [memberId])

  // ---- A day that's different ----
  const addChange = useCallback(async (c) => {
    const { data, error } = await supabase.from('routine_changes').insert({ member_id: memberId, ...c }).select('id, member_id, on_date, part, kind, item_id, title, note').single()
    if (error) { if (error.code !== '23505') setS((x) => ({ ...x, error: error.message })); return null }
    change((x) => ({ ...x, changes: [...x.changes, data] }))
    const next = cur.current
    if (c.on_date === today || c.on_date < today) await writeDay(c.on_date, c.part, next.items, next.changes, next.ticks)
    return data
  }, [memberId, today, writeDay])
  const removeChange = useCallback(async (id) => {
    const c = cur.current.changes.find((x) => x.id === id)
    change((x) => ({ ...x, changes: x.changes.filter((y) => y.id !== id), ticks: x.ticks.filter((t) => t.change_id !== id) }))
    const next = cur.current
    const { error } = await supabase.from('routine_changes').delete().eq('id', id).eq('member_id', memberId)
    if (error) { setS((x) => ({ ...x, error: error.message })); return }
    if (c && c.on_date <= today) await writeDay(c.on_date, c.part, next.items, next.changes, next.ticks)
  }, [memberId, today, writeDay])

  // ---- The challenges: decide one that's over, plan the next ----
  const list = useMemo(() => catalogue(s.overrides), [s.overrides])
  const decided = useRef(new Set())
  useEffect(() => {
    if (!s.loaded || s.error || !withFamily || !today) return
    let changed = false
    const work = async () => {
      for (const run of s.runs.filter((r) => r.status === 'planned' && r.starts_on <= today)) {
        if (decided.current.has(run.id)) continue
        const st = standing(run, s.familyRows, today)
        if (!st.final || (st.state !== 'won' && st.state !== 'missed')) continue
        decided.current.add(run.id)
        const { error } = await supabase.from('challenge_runs').update({ status: st.state, result: { have: st.have, need: st.need, words: st.words, people: st.people }, decided_at: new Date().toISOString() }).eq('id', run.id).eq('status', 'planned')
        if (!error) changed = true
      }
      const settings = s.settings || {}
      const next = planNext({ list, runs: s.runs, rows: s.familyRows, today, pace: settings.pace, on: settings.challenges_on !== false })
      if (next && !decided.current.has('plan:' + next.starts_on)) {
        decided.current.add('plan:' + next.starts_on)
        const { error } = await supabase.from('challenge_runs').insert({ challenge_key: next.key, spec: next.spec, starts_on: next.starts_on, ends_on: next.ends_on, status: 'planned', planned_by: 'auto' })
        if (!error || error.code === '23505') changed = true
      }
      if (changed && live.current) {
        const { data } = await supabase.from('challenge_runs').select('*').order('starts_on')
        if (data && live.current) setS((x) => ({ ...x, runs: data }))
      }
    }
    work()
  }, [s.loaded, s.runs, s.familyRows, s.settings, list, today, withFamily]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...s, catalogue: list, reload, tick, untick, saveItem, setArchived, move, addChange, removeChange, clearError: () => setS((x) => ({ ...x, error: null })) }
}

function upsertRow(rows, row) {
  const k = rows.findIndex((r) => r.member_id === row.member_id && r.on_date === row.on_date && r.part === row.part)
  if (k < 0) return [...rows, row]
  const out = [...rows]; out[k] = { ...out[k], ...row }; return out
}
