// The morning and evening lists: what comes up on a day, streaks, records and their words (src/lib/routines.js).
// Every list here is made up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  listDay, partForHour, timesBefore, itemOn, dayList, daySummary, dayMarks, streakFrom, runsFrom, recordsFrom,
  perfectWeeks, milestoneAt, perksFor, perkAt, mournWords, progressWords, doneWords, goldenKey, ruleWords,
  schoolDayFor, entryKey, tickFor, minutesAtHome, clockWords, namesFor, NAMES,
} from '../src/lib/routines.js'
import { addDays, dow } from '../src/lib/cal/dates.js'

const item = (o) => ({ id: o.id || 'i1', part: 'morning', title: 'Make the bed', weekdays: [0, 1, 2, 3, 4, 5, 6], every_weeks: 1, school: 'any', turns: [], starts_on: '2026-11-01', sort: 0, ...o })

test('the day turns over at three in the morning, so a late Night Owl still counts for the evening before', () => {
  assert.equal(listDay(new Date('2026-11-07T09:30:00Z')), '2026-11-06') // 1:30 AM at home
  assert.equal(listDay(new Date('2026-11-07T11:05:00Z')), '2026-11-07') // 3:05 AM
  assert.equal(listDay(new Date('2026-11-08T07:00:00Z')), '2026-11-07') // 11 PM
  assert.equal(partForHour(6), 'morning'); assert.equal(partForHour(13), 'morning'); assert.equal(partForHour(14), 'evening'); assert.equal(partForHour(1), 'evening')
})

test('a rotation’s count of times so far agrees with counting day by day', () => {
  const cases = [
    item({ weekdays: [1, 3, 5], starts_on: '2026-11-04' }),
    item({ weekdays: [0, 6], every_weeks: 2, starts_on: '2026-11-07' }),
    item({ weekdays: [2], every_weeks: 3, starts_on: '2026-10-27' }),
    item({ starts_on: '2026-11-05' }),
  ]
  for (const it of cases) {
    let n = 0
    for (let d = it.starts_on; d <= '2027-02-10'; d = addDays(d, 1)) {
      assert.equal(timesBefore(it, d), n, `${it.weekdays} every ${it.every_weeks} from ${it.starts_on}, on ${d}`)
      if (itemOn(it, d)) n++
    }
  }
})

test('what comes up: weekdays, every other week, school days, turns, for a while, and taken off', () => {
  const mwf = item({ weekdays: [1, 3, 5] })
  assert.ok(itemOn(mwf, '2026-11-09')) // Monday
  assert.equal(itemOn(mwf, '2026-11-10'), null)
  const fortnight = item({ weekdays: [6], every_weeks: 2, starts_on: '2026-11-07' })
  assert.ok(itemOn(fortnight, '2026-11-07')); assert.equal(itemOn(fortnight, '2026-11-14'), null); assert.ok(itemOn(fortnight, '2026-11-21'))
  const pack = item({ school: 'school', title: 'Pack the backpack' })
  const school = (d) => (d === '2026-11-11' ? false : dow(d) > 0 && dow(d) < 6)
  assert.ok(itemOn(pack, '2026-11-10', school)); assert.equal(itemOn(pack, '2026-11-11', school), null); assert.equal(itemOn(pack, '2026-11-08', school), null)
  assert.equal(itemOn(pack, '2026-11-10').maybe, true) // nobody knows: it may come up
  const tidy = item({ title: 'Tidy', turns: ['bedroom', 'bathroom', 'desk'], weekdays: [1, 2, 3, 4, 5], starts_on: '2026-11-09' })
  assert.deepEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16'].map((d) => itemOn(tidy, d).title), ['bedroom', 'bathroom', 'desk', 'bedroom', 'bathroom', 'desk'])
  assert.deepEqual(itemOn(tidy, '2026-11-11').turn, { k: 2, of: 3, of_what: 'Tidy' })
  assert.equal(itemOn(item({ ends_on: '2026-11-10' }), '2026-11-11'), null)
  assert.equal(itemOn(item({ archived_on: '2026-11-10' }), '2026-11-10'), null, 'taken off today is gone today')
  assert.ok(itemOn(item({ archived_on: '2026-11-10' }), '2026-11-09'), 'and still there on the days before')
  assert.equal(itemOn(item({ starts_on: '2026-11-12' }), '2026-11-11'), null)
})

test('a day’s list: in order, less what’s skipped, plus what’s added; a day of rest has nothing on it', () => {
  const items = [item({ id: 'b', sort: 2, title: 'Teeth' }), item({ id: 'a', sort: 1, title: 'Bed' }), item({ id: 'c', part: 'evening', title: 'Read' })]
  const changes = [
    { id: 'x1', on_date: '2026-11-09', part: 'morning', kind: 'skip', item_id: 'b' },
    { id: 'x2', on_date: '2026-11-09', part: 'morning', kind: 'add', title: 'Field trip form' },
    { id: 'x3', on_date: '2026-11-10', part: 'morning', kind: 'rest', note: 'Sick' },
  ]
  const l = dayList({ items, changes, date: '2026-11-09', part: 'morning' })
  assert.deepEqual(l.entries.map((e) => e.title), ['Bed', 'Field trip form'])
  assert.deepEqual(l.skippedEntries.map((e) => e.title), ['Teeth'])
  assert.deepEqual(l.entries.map(entryKey), ['i:a', 'c:x2'])
  const rest = dayList({ items, changes, date: '2026-11-10', part: 'morning' })
  assert.equal(rest.rest, true); assert.equal(rest.restNote, 'Sick'); assert.equal(rest.entries.length, 0)
  const ticks = [{ item_id: 'a', done_at: '2026-11-09T15:02:00Z' }, { change_id: 'x2', done_at: '2026-11-09T15:10:00Z' }]
  assert.ok(tickFor(l.entries[1], ticks))
  assert.deepEqual(daySummary(l, ticks), { status: 'done', total: 2, done: 2, first_at: '2026-11-09T15:02:00Z', done_at: '2026-11-09T15:10:00Z' })
  assert.equal(daySummary(l, ticks.slice(0, 1)).status, 'open')
  assert.equal(daySummary(rest, []).status, 'rest')
})

const row = (on_date, status, o = {}) => ({ member_id: 'm', on_date, part: 'morning', status, total: 3, done: status === 'done' ? 3 : 1, ...o })

test('streaks: rest days and empty days hold a streak; a missed day ends it; today is pending until done', () => {
  const items = [item({ weekdays: [1, 2, 3, 4, 5], starts_on: '2026-11-02' })] // weekdays only
  const rows = [row('2026-11-02', 'done'), row('2026-11-03', 'done'), row('2026-11-04', 'rest'), row('2026-11-05', 'done'), row('2026-11-06', 'done'),
    /* the weekend has nothing on it */ row('2026-11-09', 'done')]
  const marks = dayMarks({ rows, items, part: 'morning', today: '2026-11-10' })
  assert.equal(marks.get('2026-11-07'), 'skip'); assert.equal(marks.get('2026-11-04'), 'skip'); assert.equal(marks.get('2026-11-10'), 'pending')
  const s = streakFrom(marks)
  assert.equal(s.current, 5); assert.equal(s.best, 5); assert.equal(s.ended, null); assert.equal(s.doneToday, false)
  // Tuesday never happened, and it's Wednesday now
  const broken = streakFrom(dayMarks({ rows, items, part: 'morning', today: '2026-11-11' }))
  assert.equal(broken.current, 0); assert.deepEqual(broken.ended, { length: 5, on: '2026-11-10' })
  // Done today counts today
  const today = streakFrom(dayMarks({ rows: [...rows, row('2026-11-10', 'done')], items, part: 'morning', today: '2026-11-10' }))
  assert.equal(today.current, 6); assert.equal(today.doneToday, true)
  assert.deepEqual(runsFrom(dayMarks({ rows: [...rows, row('2026-11-11', 'done')], items, part: 'morning', today: '2026-11-12' })), [5, 1])
})

test('a day nobody wrote down only counts against you when something certainly came up', () => {
  const items = [item({ school: 'school', starts_on: '2026-11-02' })]
  const marks = dayMarks({ rows: [row('2026-11-02', 'done')], items, part: 'morning', today: '2026-11-05' })
  assert.equal(marks.get('2026-11-03'), 'skip', 'a school-days item on a day the calendar can’t say')
  assert.equal(streakFrom(marks).current, 1)
})

test('records: the earliest finish (not counting the small hours), the quickest, golden feathers, the sun beaten', () => {
  const rows = [
    { part: 'morning', on_date: '2026-11-09', status: 'done', total: 4, first_at: '2026-11-09T14:50:00Z', done_at: '2026-11-09T15:05:00Z' }, // 7:05 AM, 15 min
    { part: 'morning', on_date: '2026-11-10', status: 'done', total: 4, first_at: '2026-11-10T14:00:00Z', done_at: '2026-11-10T14:08:00Z', golden: true }, // 6:08, 8 min
    { part: 'morning', on_date: '2026-11-11', status: 'open', total: 4 },
    { part: 'evening', on_date: '2026-11-11', status: 'done', total: 2, done_at: '2026-11-12T09:30:00Z' }, // 1:30 AM: late, not early
    { part: 'evening', on_date: '2026-11-12', status: 'done', total: 2, done_at: '2026-11-13T04:00:00Z' }, // 8 PM
  ]
  const m = recordsFrom(rows, 'morning', { sunriseAt: (d) => new Date(`${d}T14:20:00Z`) })
  assert.equal(m.finished, 2); assert.equal(m.earliest.minutes, 6 * 60 + 8); assert.equal(m.quickest.minutes, 8); assert.equal(m.golden, 1); assert.equal(m.beatSun, 1)
  assert.equal(recordsFrom(rows, 'evening').earliest.minutes, 20 * 60)
  assert.equal(minutesAtHome('2026-11-09T15:05:00Z'), 425); assert.equal(clockWords(425), '7:05 AM'); assert.equal(clockWords(0), '12:00 AM')
})

test('a perfect week is Monday to Sunday with nothing missed on either list', () => {
  const m = new Map(), e = new Map()
  for (let d = '2026-11-02'; d <= '2026-11-15'; d = addDays(d, 1)) { m.set(d, 'done'); e.set(d, d === '2026-11-12' ? 'miss' : 'done') }
  assert.equal(perfectWeeks(m, e, '2026-11-20'), 1)
  assert.equal(perfectWeeks(m, e, '2026-11-08'), 0, 'a week still going isn’t counted yet')
})

test('milestones, the perks a bird keeps for good, and the words', () => {
  assert.equal(milestoneAt(7, 'morning').title, 'A whole week of mornings!')
  assert.equal(milestoneAt(8, 'morning'), null)
  assert.deepEqual(perksFor(31).map((p) => p.key), ['scarf', 'flower', 'crown'])
  assert.equal(perkAt(14).key, 'flower'); assert.equal(perkAt(15), null)
  const w = mournWords({ length: 9, part: 'evening', runs: [9, 4], on: '2026-11-09', today: '2026-11-10' })
  assert.equal(w.title, 'Your 9-evening streak ended yesterday.')
  assert.match(w.line, /longest ever/)
  assert.ok(w.cheer.length > 10)
  assert.match(mournWords({ length: 4, part: 'morning', runs: [9, 4], on: '2026-11-09', today: '2026-11-10' }).line, /second-longest/)
  assert.equal(progressWords(3, 4, 'x').length > 0, true); assert.equal(progressWords(4, 4), 'All done!'); assert.equal(progressWords(1, 4), 'Three to go.')
  assert.deepEqual(doneWords({ part: 'morning', streak: 6, previousBest: 5, minutes: 425, beatSunBy: 3 }), { head: 'Done by 7:05 AM', line: '6 mornings in a row · your longest yet! · you beat the sun by 3 minutes' })
})

test('a golden feather glints about one day in nine, on one thing, the same all day', () => {
  const entries = [{ kind: 'item', id: 'a' }, { kind: 'item', id: 'b' }, { kind: 'item', id: 'c' }]
  let n = 0
  for (let d = '2026-01-01'; d < '2028-01-01'; d = addDays(d, 1)) if (goldenKey('m1', d, 'morning', entries)) n++
  assert.ok(n > 730 / 14 && n < 730 / 6, `${n} golden days in two years`)
  const d = '2026-11-09'
  assert.equal(goldenKey('m1', d, 'morning', entries), goldenKey('m1', d, 'morning', entries))
  assert.equal(goldenKey('m1', d, 'morning', entries.slice(0, 1)), null, 'never on a list of one')
})

test('an item’s rule in words', () => {
  assert.equal(ruleWords(item({})), 'Every day')
  assert.equal(ruleWords(item({ weekdays: [1, 2, 3, 4, 5], school: 'school' })), 'Weekdays · school days')
  assert.equal(ruleWords(item({ weekdays: [6], every_weeks: 2 })), 'Every other week: Sat')
  assert.equal(ruleWords(item({ weekdays: [1, 3, 5], turns: ['piano', 'reading'] })), 'Mon, Wed, Fri · takes turns: piano, reading')
})

test('school days come from the school’s calendar; with none, every weekday is one', () => {
  const off = { '2026-11-11': new Set(['ruble']) }
  const anna = schoolDayFor('ruble', off)
  assert.equal(anna('2026-11-10'), true); assert.equal(anna('2026-11-11'), false); assert.equal(anna('2026-11-14'), false)
  assert.equal(schoolDayFor(null, off)('2026-11-11'), true)
  assert.equal(schoolDayFor('ruble', off, (d) => d < '2026-11-20')('2026-11-25'), null)
})

test('the names Admin can choose, each a pair', () => {
  for (const n of Object.values(NAMES)) assert.ok(n.morning && n.evening && n.both && n.line)
  assert.equal(namesFor('nope').morning, 'Early Bird')
})

test('someone else’s streak comes from their own device’s note on the day’s row, and lapses when a day is missed', async () => {
  const { streakShown } = await import('../src/lib/routines.js')
  const r = (on_date, status, streak) => ({ part: 'morning', on_date, status, streak })
  assert.equal(streakShown([r('2026-11-10', 'open', 6)], 'morning', '2026-11-10'), 6, 'today’s row carries the streak through yesterday')
  assert.equal(streakShown([r('2026-11-09', 'done', 7)], 'morning', '2026-11-10'), 7, 'done yesterday: still going until today is over')
  assert.equal(streakShown([r('2026-11-09', 'open', 6)], 'morning', '2026-11-10'), 0, 'yesterday unfinished: it ended')
  assert.equal(streakShown([r('2026-11-07', 'done', 9)], 'morning', '2026-11-10'), 0)
  assert.equal(streakShown([], 'morning', '2026-11-10'), 0)
})

test('the lists are first on Home, above the weather, and the family sees only the wordless days', async () => {
  const { readFileSync } = await import('node:fs')
  const home = readFileSync(new URL('../src/places/Home.jsx', import.meta.url), 'utf8')
  assert.ok(home.indexOf('<ListsCard ') > 0 && home.indexOf('<ListsCard ') < home.indexOf('<WeatherNow'), 'the lists come before the weather')
  const hook = readFileSync(new URL('../src/lib/useLists.js', import.meta.url), 'utf8')
  // Every read of other people's data is routine_days (no words); items, changes and ticks are read for one person
  for (const t of ['routine_items', 'routine_changes', 'routine_ticks']) {
    for (const m of hook.matchAll(new RegExp(`from\\('${t}'\\)\\.select\\([^)]*\\)([^\\n]*)`, 'g'))) assert.match(m[1], /\.eq\('member_id', memberId\)/, `${t} is read for one person only`)
  }
  assert.doesNotMatch(readFileSync(new URL('../src/lib/useLists.js', import.meta.url), 'utf8').match(/const SELECT_DAY = '([^']+)'/)[1], /title|note/)
})

test('last night’s evening list is still there after the day turns over, and ticks for it count toward that night', () => {
  const it = item({ id: 'e1', part: 'evening', title: 'Brush teeth', starts_on: '2026-11-01' })
  const today = listDay(new Date('2026-11-11T16:00:00Z')) // 8 AM
  assert.equal(today, '2026-11-11')
  const last = dayList({ items: [it], changes: [], date: addDays(today, -1), part: 'evening' })
  assert.equal(last.entries.length, 1)
  const ticks = [{ item_id: 'e1', on_date: '2026-11-10', part: 'evening', done_at: '2026-11-11T16:01:00Z' }]
  assert.equal(daySummary(last, ticks).status, 'done')
})
