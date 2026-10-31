// Sacred Heart's Mass times, read from made-up pages shaped like parish sites
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageLines, massLinks, daysIn, timesIn, parseSchedule, isSound, scheduleKey, markKinds, notesOf } from '../supabase/functions/_shared/parish.js'

const times = (s, d) => (s.mass[d] || []).map((e) => e.time + (e.note ? ' ' + e.note : '') + (e.daily ? ' [daily]' : '') + (e.vigil ? ' [vigil]' : ''))

test('days: single, ranges, lists, Spanish and weekdays', () => {
  assert.deepEqual(daysIn('Monday - Friday'), [1, 2, 3, 4, 5])
  assert.deepEqual(daysIn('Mon–Sat'), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(daysIn('Monday through Saturday:'), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(daysIn('Tuesdays & Thursdays'), [2, 4])
  assert.deepEqual(daysIn('lunes a viernes'), [1, 2, 3, 4, 5])
  assert.deepEqual(daysIn('Sábado'), [6])
  assert.deepEqual(daysIn('Weekdays'), [1, 2, 3, 4, 5])
  assert.equal(daysIn('Our monthly satisfaction month'), null)
  assert.equal(daysIn('Mass Times'), null)
})

test('times: am/pm, a shared am/pm, noon; never an address or a phone number', () => {
  assert.deepEqual(timesIn('7:00 AM, 8:30 a.m. (Spanish), 12 noon').map((t) => t.text), ['7:00 AM', '8:30 AM', '12:00 PM'])
  assert.deepEqual(timesIn('5:00 - 6:00 PM').map((t) => t.text), ['5:00 PM', '6:00 PM'])
  assert.deepEqual(timesIn('7pm').map((t) => t.text), ['7:00 PM'])
  assert.deepEqual(timesIn('12704 Foothill Blvd · (909) 899-1049').map((t) => t.text), [])
  assert.deepEqual(timesIn('7:30').map((t) => t.text), ['7:30 AM'])
})

test('what a Mass says about itself', () => {
  assert.deepEqual(notesOf(' (Spanish)'), { note: 'in Spanish', vigil: false })
  assert.deepEqual(notesOf(' - ASL'), { note: 'with ASL', vigil: false })
  assert.deepEqual(notesOf(' Vigil'), { note: '', vigil: true })
})

// A page laid out with headings and one line per day (made up)
const PAGE_A = `<html><head><style>.x{}</style><script>var t="7:00 AM Sunday"</script></head><body>
<nav><a href="/mass-times">Mass Times</a> <a href="https://www.sacredheartrc.org/sacraments/">Sacraments</a> <a href="https://elsewhere.example/mass">Other parish</a> <a href="/donate">Donate</a></nav>
<h2>Mass Times</h2>
<h3>Weekend Masses</h3>
<p>Saturday Vigil: 5:00 PM</p>
<p>Sunday: 7:00 AM, 8:30 AM (Spanish), 10:30 AM (ASL), 12:30 PM, 5:00 PM, 7:00 PM (Español)</p>
<h3>Daily Mass</h3>
<p>Monday &ndash; Saturday: 7:30 AM</p>
<p>Tuesday: 6:15 PM (Spanish)</p>
<p>Wednesday: 6:15 PM</p>
<h3>Confessions</h3>
<p>Tuesday 5:00 &ndash; 6:00 PM<br>Saturday 3:30 - 4:30 PM</p>
<h3>Adoration</h3>
<p>Friday 8:00 AM - 7:00 PM</p>
<h3>Parish Office</h3><p>Monday - Friday 9:00 AM - 5:00 PM · (909) 899-1049 · 12704 Foothill Blvd</p>
<footer>© 2026 Sacred Heart</footer></body></html>`

test('a page with headings: the weekend, Daily Mass marked, confession, and nothing from adoration or the office', () => {
  const s = parseSchedule(pageLines(PAGE_A))
  assert.deepEqual(times(s, 0), ['7:00 AM', '8:30 AM in Spanish', '10:30 AM with ASL', '12:30 PM', '5:00 PM', '7:00 PM in Spanish'])
  assert.deepEqual(times(s, 1), ['7:30 AM [daily]'])
  assert.deepEqual(times(s, 2), ['7:30 AM [daily]', '6:15 PM in Spanish [daily]'])
  assert.deepEqual(times(s, 3), ['7:30 AM [daily]', '6:15 PM [daily]'])
  assert.deepEqual(times(s, 5), ['7:30 AM [daily]'])
  assert.deepEqual(times(s, 6), ['7:30 AM [daily]', '5:00 PM [vigil]'])
  assert.deepEqual(s.confession, { 2: ['5:00–6:00 PM'], 6: ['3:30–4:30 PM'] })
  assert.ok(isSound(s))
})

// A page laid out as a table of days, in two languages (made up)
const PAGE_B = `<div class="sched"><h4>MASS SCHEDULE / HORARIO DE MISAS</h4>
<table><tr><td>Sunday / Domingo</td><td>8:00am, 10:00am, 12:00pm (Bilingual), 6pm</td></tr>
<tr><td>Saturday</td><td>8:00am · 5:30pm Vigil</td></tr>
<tr><td>Weekdays</td><td>8:00am</td></tr></table>
<h4>Reconciliation</h4><p>Saturdays 11:00am-12:00pm</p></div>`

test('a table of days, Saturday morning daily and evening the vigil', () => {
  const s = parseSchedule(pageLines(PAGE_B))
  assert.deepEqual(times(s, 0), ['8:00 AM', '10:00 AM', '12:00 PM bilingual', '6:00 PM'])
  assert.deepEqual(times(s, 6), ['8:00 AM [daily]', '5:30 PM [vigil]'])
  assert.deepEqual(times(s, 4), ['8:00 AM [daily]'])
  assert.deepEqual(s.confession, { 6: ['11:00 AM–12:00 PM'] })
  assert.ok(isSound(s))
})

test('a page with no schedule reads as nothing, and nothing is not sound', () => {
  const s = parseSchedule(pageLines('<h1>Welcome</h1><p>Mass Times</p><p>Join us for our fall festival on Sunday!</p>'))
  assert.deepEqual(s, { mass: {}, confession: {} })
  assert.equal(isSound(s), false)
})

test('links to the Mass-times page stay on the parish’s own site', () => {
  assert.deepEqual(massLinks(PAGE_A), ['https://www.sacredheartrc.org/mass-times', 'https://www.sacredheartrc.org/sacraments/'])
})

test('the same week reads the same key; a changed time does not', () => {
  const a = parseSchedule(pageLines(PAGE_A)), b = parseSchedule(pageLines(PAGE_A))
  assert.equal(scheduleKey(a), scheduleKey(b))
  const c = parseSchedule(pageLines(PAGE_A.replace('12:30 PM', '1:00 PM')))
  assert.notEqual(scheduleKey(a), scheduleKey(c))
})

test('every weekday Mass is a Daily Mass, Sunday’s never', () => {
  const m = markKinds({ 0: [{ time: '9:00 AM' }], 2: [{ time: '6:15 PM' }], 6: [{ time: '7:30 AM' }, { time: '5:00 PM' }] })
  assert.equal(m[0][0].daily, false)
  assert.equal(m[2][0].daily, true)
  assert.deepEqual(m[6].map((e) => [e.daily, e.vigil]), [[true, false], [false, true]])
})
