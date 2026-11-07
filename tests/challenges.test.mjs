// The family's challenges: the built-in set, Admin's changes, when the next one starts, and how one stands
// (src/lib/challenges.js). Every day here is made up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BUILT_IN, KINDS, LEVELS, catalogue, readiness, planNext, startFor, standing, runFor, fullMoonsFrom, sunriseAt, peopleIn, LEVEL_PATTERN } from '../src/lib/challenges.js'
import { addDays, dow } from '../src/lib/cal/dates.js'
import { minutesAtHome } from '../src/lib/routines.js'

const sql = readFileSync(new URL('../supabase/migrations/20261107180000_morning_evening_lists.sql', import.meta.url), 'utf8')

test('every built-in challenge is complete, its key fits the database, and the kinds agree with the migration', () => {
  const keys = new Set()
  for (const c of BUILT_IN) {
    assert.match(c.key, /^[a-z0-9-]{2,60}$/); assert.ok(!keys.has(c.key)); keys.add(c.key)
    assert.ok(c.title && c.blurb && KINDS[c.kind] && LEVELS.includes(c.level) && c.days >= 1 && c.days <= 31 && c.target >= 1, c.key)
    if (c.kind === 'by-time') assert.match(c.by_time, /^\d\d:\d\d$/)
    if (c.kind !== 'share') assert.ok(c.target <= c.days || c.kind === 'firsts', `${c.key} asks for more days than it has`)
  }
  for (const level of LEVELS) assert.ok(BUILT_IN.filter((c) => c.level === level).length >= 3, `enough ${level} ones`)
  const inSql = sql.match(/kind is null or kind in \(([^)]+)\)/)[1].match(/'([a-z-]+)'/g).map((s) => s.slice(1, -1))
  assert.deepEqual(inSql.sort(), Object.keys(KINDS).sort())
})

test('Admin’s changes go over the built-in ones; the family’s own are added when complete', () => {
  const list = catalogue([
    { key: 'perfect-week', enabled: false },
    { key: 'out-the-door', by_time: '07:45', target: 4 },
    { key: 'pancakes', custom: true, title: 'Pancake Saturday', kind: 'everyone', part: 'morning', level: 'easy', days: 1, target: 1 },
    { key: 'half-done', custom: true, title: 'Missing its numbers', kind: 'everyone', level: 'easy' },
  ])
  assert.equal(list.find((c) => c.key === 'perfect-week').enabled, false)
  const door = list.find((c) => c.key === 'out-the-door')
  assert.equal(door.by_time, '07:45'); assert.equal(door.target, 4); assert.equal(door.title, 'Out the Door')
  assert.ok(list.find((c) => c.key === 'pancakes').custom)
  assert.equal(list.find((c) => c.key === 'half-done'), undefined)
})

// Two people, each finishing both lists on the days given
const days = (people, dates, o = {}) => people.flatMap((p) => dates.flatMap((d) => ['morning', 'evening'].map((part) => ({ member_id: p, on_date: d, part, status: 'done', total: 3, done: 3, done_at: `${d}T15:00:00Z`, ...o }))))
const week = (from, n) => Array.from({ length: n }, (_, i) => addDays(from, i))

test('the challenges wait until two of us have finished a list on three days each', () => {
  assert.equal(readiness(days(['j'], week('2026-11-01', 5))).ready, false)
  assert.equal(readiness(days(['j', 'l'], week('2026-11-01', 2))).ready, false)
  assert.equal(readiness(days(['j', 'l'], week('2026-11-01', 3))).ready, true)
  const list = catalogue([])
  assert.equal(planNext({ list, rows: days(['j', 'l'], week('2026-11-01', 2)), today: '2026-11-03' }), null)
  assert.equal(planNext({ list, rows: days(['j', 'l'], week('2026-11-01', 4)), today: '2026-11-04', on: false }), null)
})

test('the first challenge is an easy one, and nothing is planned over one under way', () => {
  const rows = days(['j', 'l', 'a'], week('2026-11-01', 4))
  const next = planNext({ list: catalogue([]), rows, today: '2026-11-04' })
  assert.ok(next)
  assert.equal(next.spec.level, LEVEL_PATTERN[0])
  assert.deepEqual(next.spec.people, ['a', 'j', 'l'])
  assert.ok(next.starts_on >= '2026-11-04')
  assert.deepEqual(planNext({ list: catalogue([]), rows, today: '2026-11-04' }), next, 'every phone plans the same one')
  const runs = [{ challenge_key: next.key, starts_on: next.starts_on, ends_on: next.ends_on, status: 'planned' }]
  assert.equal(planNext({ list: catalogue([]), runs, rows, today: '2026-11-04' }), null)
})

test('after one ends there’s a gap, the level moves on, and the last few aren’t repeated', () => {
  const rows = days(['j', 'l'], week('2026-11-01', 20))
  const runs = [{ challenge_key: 'all-together', starts_on: '2026-11-04', ends_on: '2026-11-07', status: 'won', decided_at: '2026-11-05T15:00:00Z' }]
  const next = planNext({ list: catalogue([]), runs, rows, today: '2026-11-06', pace: 'regular' })
  assert.ok(next.starts_on >= '2026-11-09', `starts ${next.starts_on}: three days after it was won`)
  assert.notEqual(next.key, 'all-together')
  assert.ok(['medium'].includes(next.spec.level) || next.key === 'moonlit')
  const lively = planNext({ list: catalogue([]), runs, rows, today: '2026-11-06', pace: 'lively' })
  assert.ok(lively.starts_on <= next.starts_on)
})

test('each is timed to suit it: Saturdays, Mondays, the full moon, and only late sunrises for beating the sun', () => {
  const sat = startFor(BUILT_IN.find((c) => c.key === 'weekend-warriors'), '2026-11-04')
  assert.equal(dow(sat), 6); assert.equal(sat, '2026-11-07')
  assert.equal(dow(startFor(BUILT_IN.find((c) => c.key === 'perfect-week'), '2026-11-04')), 1)
  const fm = fullMoonsFrom('2026-11-01')[0]
  assert.equal(fm.date, '2026-11-24')
  assert.equal(startFor(BUILT_IN.find((c) => c.key === 'moonlit'), '2026-11-20'), '2026-11-23')
  assert.equal(startFor(BUILT_IN.find((c) => c.key === 'moonlit'), '2026-11-01'), null, 'too far off to plan yet')
  const sun = BUILT_IN.find((c) => c.key === 'beat-the-sun')
  assert.ok(startFor(sun, '2026-12-15'), 'December sunrises come late')
  assert.equal(startFor(sun, '2026-06-15'), null, 'June’s don’t')
  assert.ok(minutesAtHome(sunriseAt('2026-12-21').toISOString()) > 6 * 60 + 40)
})

test('everyone, both lists: a day counts when every one of us is done (or resting), and a lost cause ends early', () => {
  const run = runFor(BUILT_IN.find((c) => c.key === 'three-day-sweep'), '2026-11-09', days(['j', 'l'], week('2026-11-01', 8)), '2026-11-08')
  assert.equal(run.ends_on, '2026-11-13'); assert.equal(run.spec.consecutive, true)
  const rows = [...days(['j', 'l'], ['2026-11-09', '2026-11-10']), ...days(['j'], ['2026-11-11']), ...days(['l'], ['2026-11-11'], { status: 'rest', done: 0, total: 0 })]
  let st = standing(run, rows, '2026-11-11')
  assert.equal(st.state, 'won'); assert.equal(st.have, 3); assert.ok(st.final)
  st = standing(run, days(['j', 'l'], ['2026-11-09']), '2026-11-10')
  assert.equal(st.state, 'on'); assert.equal(st.words, '1 of 3 days')
  // Two missed days in the middle leave no three in a row
  st = standing(run, days(['j', 'l'], ['2026-11-09', '2026-11-12']), '2026-11-12')
  assert.equal(st.state, 'missed'); assert.ok(st.final)
  assert.equal(standing(run, [], '2026-11-07').state, 'coming')
  assert.equal(standing(run, [], '2026-11-08').words, 'Starts tomorrow')
})

test('someone with no evening list is only asked for the morning in a both-lists challenge', () => {
  const morningOnly = (p, ds) => ds.map((d) => ({ member_id: p, on_date: d, part: 'morning', status: 'done', total: 2, done: 2, done_at: `${d}T15:00:00Z` }))
  const history = [...days(['j'], week('2026-11-01', 7)), ...morningOnly('a', week('2026-11-01', 7))]
  const run = runFor(BUILT_IN.find((c) => c.key === 'all-together'), '2026-11-09', history, '2026-11-08')
  assert.deepEqual(run.spec.keeps.a, ['morning'])
  assert.equal(standing(run, [...days(['j'], ['2026-11-09']), ...morningOnly('a', ['2026-11-09'])], '2026-11-09').state, 'won')
})

test('by a time, before the sun, and the share of everything', () => {
  const door = runFor(BUILT_IN.find((c) => c.key === 'out-the-door'), '2026-11-09', days(['j', 'l'], week('2026-11-01', 8)), '2026-11-08')
  const early = (d) => `${d}T15:10:00Z` // 7:10 AM
  const late = (d) => `${d}T16:00:00Z` // 8:00 AM
  const rows = [...['2026-11-09', '2026-11-10', '2026-11-11'].flatMap((d) => ['j', 'l'].map((p) => ({ member_id: p, on_date: d, part: 'morning', status: 'done', total: 3, done: 3, done_at: d === '2026-11-10' && p === 'l' ? late(d) : early(d) })))]
  const st = standing(door, rows, '2026-11-11')
  assert.equal(st.have, 2); assert.equal(st.state, 'on')
  const sun = runFor(BUILT_IN.find((c) => c.key === 'beat-the-sun'), '2026-12-14', days(['j', 'l'], week('2026-12-07', 7)), '2026-12-13')
  const before = ['j', 'l'].map((p) => ({ member_id: p, on_date: '2026-12-15', part: 'morning', status: 'done', total: 3, done: 3, done_at: '2026-12-15T14:30:00Z' })) // 6:30 AM, before a 6:50 sunrise
  assert.equal(standing(sun, before, '2026-12-15').state, 'won')
  const share = runFor(BUILT_IN.find((c) => c.key === 'most-of-it'), '2026-11-09', days(['j', 'l'], week('2026-11-01', 8)), '2026-11-08')
  const half = week('2026-11-09', 7).flatMap((d) => ['j', 'l'].flatMap((p) => ['morning', 'evening'].map((part) => ({ member_id: p, on_date: d, part, status: 'open', total: 4, done: 3 }))))
  const mid = standing(share, half, '2026-11-12')
  assert.equal(mid.state, 'on'); assert.equal(mid.percent, 75)
  assert.equal(standing(share, half, '2026-11-16').state, 'missed')
  const most = half.map((r) => ({ ...r, done: 4, status: 'done' }))
  assert.equal(standing(share, most, '2026-11-16').state, 'won')
})

test('everyone gets a first: each of us the first to finish one morning', () => {
  const run = runFor(BUILT_IN.find((c) => c.key === 'everyone-first'), '2026-11-09', days(['j', 'l'], week('2026-11-01', 8)), '2026-11-08')
  const m = (p, d, t) => ({ member_id: p, on_date: d, part: 'morning', status: 'done', total: 2, done: 2, done_at: `${d}T${t}:00Z` })
  let st = standing(run, [m('j', '2026-11-09', '14:00'), m('l', '2026-11-09', '14:30'), m('j', '2026-11-10', '14:00'), m('l', '2026-11-10', '14:30')], '2026-11-10')
  assert.equal(st.have, 1); assert.equal(st.state, 'on')
  st = standing(run, [m('j', '2026-11-09', '14:00'), m('l', '2026-11-09', '14:30'), m('l', '2026-11-10', '13:00'), m('j', '2026-11-10', '14:30')], '2026-11-10')
  assert.equal(st.state, 'won')
})

test('people taking part are those with something on a list lately', () => {
  const rows = [...days(['j'], ['2026-11-05']), ...days(['l'], ['2026-10-01'])]
  assert.deepEqual(peopleIn(rows, '2026-11-08'), ['j'])
})
