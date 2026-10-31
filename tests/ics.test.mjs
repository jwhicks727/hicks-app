import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFeed, lines, inferKind, zonedToUtc, expandDates } from '../supabase/functions/_shared/ics.js'

const W = { from: '2026-08-01', to: '2027-07-31' }
const feed = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Example//EN', 'X-WR-TIMEZONE:America/Los_Angeles', ...events.flat(), 'END:VCALENDAR'].join('\r\n')
const ev = (...props) => ['BEGIN:VEVENT', ...props, 'END:VEVENT']

test('folded lines and escaped words come back whole', () => {
  const ls = lines('SUMMARY:Thanksgiving\r\n  Break\r\nDESCRIPTION;LANGUAGE=en:a\\, b\; c\\nd\r\n')
  assert.deepEqual(ls[0], ['SUMMARY', {}, 'Thanksgiving Break'])
  const [e] = readFeed(feed(ev('UID:1', 'DTSTART;VALUE=DATE:20261126', 'SUMMARY:Winter Concert\\, Grades 6\;7')), W)
  assert.equal(e.title, 'Winter Concert, Grades 6;7')
})

test('a whole-day event ends the day before its exclusive end', () => {
  const [e] = readFeed(feed(ev('UID:tg', 'DTSTART;VALUE=DATE:20261123', 'DTEND;VALUE=DATE:20261128', 'SUMMARY:Thanksgiving Break - No School')), W)
  assert.deepEqual([e.starts_on, e.ends_on, e.all_day, e.kind, e.starts_at], ['2026-11-23', '2026-11-27', true, 'no_school', null])
  const [one] = readFeed(feed(ev('UID:v', 'DTSTART;VALUE=DATE:20261111', 'SUMMARY:Veterans Day Holiday')), W)
  assert.deepEqual([one.starts_on, one.ends_on], ['2026-11-11', '2026-11-11'])
})

test('times in a zone, in UTC, and in Outlook’s Windows zone names', () => {
  const rows = readFeed(feed(
    ev('UID:a', 'DTSTART;TZID=America/Los_Angeles:20261104T183000', 'DTEND;TZID=America/Los_Angeles:20261104T200000', 'SUMMARY:Open House'),
    ev('UID:b', 'DTSTART:20261105T020000Z', 'DURATION:PT90M', 'SUMMARY:Board meeting'),
    ev('UID:c', 'DTSTART;TZID="Pacific Standard Time":20260310T090000', 'DTEND;TZID="Pacific Standard Time":20260310T100000', 'SUMMARY:Spring forward check'),
  ), { from: '2026-01-01', to: '2026-12-31' })
  const [a, b, c] = ['a', 'b', 'c'].map((id) => rows.find((r) => r.external_id === id))
  assert.equal(c.starts_at, '2026-03-10T16:00:00.000Z', 'daylight time is UTC-7')
  assert.equal(a.starts_at, '2026-11-05T02:30:00.000Z', 'standard time again: UTC-8'); assert.equal(a.ends_at, '2026-11-05T04:00:00.000Z'); assert.equal(a.starts_on, '2026-11-04'); assert.equal(a.kind, 'school')
  assert.equal(b.starts_on, '2026-11-04', 'an evening in UTC is still the evening before at home'); assert.equal(b.ends_at, '2026-11-05T03:30:00.000Z')
  assert.equal(zonedToUtc(2026, 11, 1, 1, 30, 0, 'America/Los_Angeles').toISOString().slice(11, 16), '08:30', 'the first 1:30 on the night the clocks go back')
})

test('a weekly series, with a skipped date, a moved one and a cancelled one', () => {
  const rows = readFeed(feed(
    ev('UID:mm', 'DTSTART;TZID=America/Los_Angeles:20261104T183000', 'DTEND;TZID=America/Los_Angeles:20261104T200000', 'RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=6', 'EXDATE;TZID=America/Los_Angeles:20261125T183000', 'SUMMARY:Middle school ministry'),
    ev('UID:mm', 'RECURRENCE-ID;TZID=America/Los_Angeles:20261118T183000', 'DTSTART;TZID=America/Los_Angeles:20261119T190000', 'DTEND;TZID=America/Los_Angeles:20261119T203000', 'SUMMARY:Middle school ministry (Thursday this week)'),
    ev('UID:mm', 'RECURRENCE-ID;TZID=America/Los_Angeles:20261202T183000', 'DTSTART;TZID=America/Los_Angeles:20261202T183000', 'STATUS:CANCELLED', 'SUMMARY:Middle school ministry'),
  ), W)
  assert.deepEqual(rows.map((r) => r.starts_on), ['2026-11-04', '2026-11-11', '2026-11-19', '2026-12-09'])
  assert.deepEqual(rows.map((r) => r.external_id), ['mm#2026-11-04', 'mm#2026-11-11', 'mm#2026-11-18', 'mm#2026-12-09'])
  assert.equal(rows[2].title, 'Middle school ministry (Thursday this week)')
  assert.ok(rows.every((r) => r.starts_at.endsWith(':30:00.000Z') || r.starts_on === '2026-11-19'))
  assert.equal(rows[3].starts_at, '2026-12-10T02:30:00.000Z', 'after the clocks change, still 6:30 at home')
})

test('monthly and yearly rules, by weekday and by date', () => {
  assert.deepEqual(expandDates('2026-09-07', { freq: 'MONTHLY', interval: 1, count: 3, byday: [{ n: 1, wd: 1 }] }, '2027-12-31'), ['2026-09-07', '2026-10-05', '2026-11-02'])
  assert.deepEqual(expandDates('2026-01-31', { freq: 'MONTHLY', interval: 1, count: 3 }, '2027-12-31'), ['2026-01-31', '2026-03-31', '2026-05-31'], 'a month with no 31st is skipped')
  assert.deepEqual(expandDates('2026-11-26', { freq: 'YEARLY', interval: 1, count: 3, bymonth: [11], byday: [{ n: 4, wd: 4 }] }, '2030-12-31'), ['2026-11-26', '2027-11-25', '2028-11-23'])
  assert.deepEqual(expandDates('2026-10-01', { freq: 'DAILY', interval: 2, until: '2026-10-07' }, '2027-01-01'), ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07'])
  assert.ok(expandDates('2020-01-01', { freq: 'DAILY', interval: 1 }, '2099-01-01').length <= 1000, 'a series without an end is capped')
})

test('only the window is kept, cancelled events are left out, and an event needs a UID', () => {
  const rows = readFeed(feed(
    ev('UID:old', 'DTSTART;VALUE=DATE:20250101', 'SUMMARY:Long ago'),
    ev('UID:gone', 'DTSTART;VALUE=DATE:20261201', 'STATUS:CANCELLED', 'SUMMARY:Called off'),
    ev('DTSTART;VALUE=DATE:20261202', 'SUMMARY:No uid'),
    ev('UID:span', 'DTSTART;VALUE=DATE:20260720', 'DTEND;VALUE=DATE:20260810', 'SUMMARY:Summer reaches into the window'),
    ev('UID:al', 'DTSTART;VALUE=DATE:20261203', 'SUMMARY:With an alarm', 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'SUMMARY:alarm words', 'END:VALARM'),
  ), W)
  assert.deepEqual(rows.map((r) => r.external_id), ['span', 'al']); assert.equal(rows[1].title, 'With an alarm')
})

test('which days are days off', () => {
  for (const t of ['Thanksgiving Break', 'No School - Lincoln Day', 'Winter Recess', 'Martin Luther King Jr. Holiday', 'Schools Closed']) assert.equal(inferKind(t), 'no_school', t)
  for (const t of ['Staff Development Day - No Students', 'Teacher Work Day', 'Minimum Day', 'First Day of School', 'Non-Student Day']) assert.equal(inferKind(t), 'school', t)
  for (const t of ['Book Fair', 'Picture Day', 'Board Meeting']) assert.equal(inferKind(t), 'event', t)
})

test('a re-read updates in place, keeps what a person hid, and never touches the past', async () => {
  const { planSync, summary } = await import('../supabase/functions/_shared/sync.js')
  const existing = [
    { id: 1, external_id: 'a', status: 'approved', notes: null, title: 'Book fair', starts_on: '2026-11-10', ends_on: '2026-11-10', starts_at: null, ends_at: null, kind: 'event' },
    { id: 2, external_id: 'b', status: 'hidden', notes: 'Not ours', title: 'Band night', starts_on: '2026-11-12', ends_on: '2026-11-12', starts_at: null, ends_at: null, kind: 'event' },
    { id: 3, external_id: 'c', status: 'approved', notes: null, title: 'Picture day', starts_on: '2026-11-20', ends_on: '2026-11-20', starts_at: null, ends_at: null, kind: 'event' },
    { id: 4, external_id: 'old', status: 'approved', notes: null, title: 'Back to school night', starts_on: '2026-09-01', ends_on: '2026-09-01', starts_at: null, ends_at: null, kind: 'school' },
    { id: 5, external_id: 'd', status: 'hidden', notes: 'Left the feed on 2026-10-01', title: 'Fun run', starts_on: '2026-12-01', ends_on: '2026-12-01', starts_at: null, ends_at: null, kind: 'event' },
  ]
  const incoming = [
    { external_id: 'a', title: 'Book fair', starts_on: '2026-11-11', ends_on: '2026-11-11', starts_at: null, ends_at: null, kind: 'event' },
    { external_id: 'b', title: 'Band night', starts_on: '2026-11-12', ends_on: '2026-11-12', starts_at: null, ends_at: null, kind: 'event' },
    { external_id: 'd', title: 'Fun run', starts_on: '2026-12-01', ends_on: '2026-12-01', starts_at: null, ends_at: null, kind: 'event' },
    { external_id: 'e', title: 'Winter break', starts_on: '2026-12-21', ends_on: '2027-01-01', starts_at: null, ends_at: null, kind: 'no_school' },
  ]
  const plan = planSync(existing, incoming, { sourceId: 's', versionId: 'v2', today: '2026-10-31', to: '2028-10-31' })
  const by = Object.fromEntries(plan.upserts.map((u) => [u.external_id, u]))
  assert.equal(by.a.starts_on, '2026-11-11'); assert.equal(by.a.status, 'approved'); assert.equal(by.a.version_id, 'v2')
  assert.equal(by.b.status, 'hidden', 'a person hid it'); assert.equal(by.b.notes, 'Not ours')
  assert.equal(by.d.status, 'approved', 'back in the feed'); assert.equal(by.d.notes, null)
  assert.deepEqual(plan.hide, [3], 'an upcoming event that left is hidden; the past one is kept')
  assert.equal(plan.note, 'Left the feed on 2026-10-31')
  assert.deepEqual(plan.counts, { new: 1, changed: 1, same: 1, back: 1, left: 1 })
  assert.equal(summary(4, plan.counts), 'Read 4 events: 1 new, 1 changed, 1 back in the feed, 1 left the feed')
  assert.equal(summary(1, { new: 0, changed: 0, back: 0, left: 0 }), 'Read 1 event, nothing new')
})

test('only real web addresses are read', async () => {
  const { safeFeedUrl } = await import('../supabase/functions/_shared/sync.js')
  assert.equal(safeFeedUrl('webcal://calendar.example.org/district.ics'), 'https://calendar.example.org/district.ics')
  assert.equal(safeFeedUrl(' https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/public/basic.ics '), 'https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/public/basic.ics')
  for (const bad of ['http://localhost:54321/x.ics', 'https://127.0.0.1/x', 'http://169.254.169.254/latest', 'https://10.0.0.5/x', 'http://192.168.1.2/x', 'https://[::1]/x', 'file:///etc/passwd', 'ftp://example.org/x.ics', 'https://user:pw@example.org/x.ics', 'https://intranet/x.ics', 'not a link'])
    assert.equal(safeFeedUrl(bad), null, bad)
})
