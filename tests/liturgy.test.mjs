import { test } from 'node:test'
import assert from 'node:assert/strict'
import { easter, keyDates, liturgicalDay, cycles, seasonOf, readingsUrl } from '../src/lib/cal/liturgy.js'

const day = (d) => liturgicalDay(d)

test('Easter falls where the tables say', () => {
  const known = { 2019: '2019-04-21', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21', 2035: '2035-03-25', 2038: '2038-04-25', 2285: '2285-03-22' }
  for (const [y, d] of Object.entries(known)) assert.equal(easter(Number(y)), d, y)
})

test('the moveable days of 2026', () => {
  const k = keyDates(2026)
  assert.equal(k.epiphany, '2026-01-04'); assert.equal(k.baptism, '2026-01-11'); assert.equal(k.ashWednesday, '2026-02-18')
  assert.equal(k.ascension, '2026-05-17'); assert.equal(k.pentecost, '2026-05-24'); assert.equal(k.sacredHeart, '2026-06-12')
  assert.equal(k.christTheKing, '2026-11-22'); assert.equal(k.advent1, '2026-11-29'); assert.equal(k.holyFamily, '2026-12-27')
})

test('the Baptism moves to Monday when the Epiphany is January 7 or 8', () => {
  assert.equal(keyDates(2023).baptism, '2023-01-09')
  assert.equal(keyDates(2028).epiphany, '2028-01-02'); assert.equal(keyDates(2028).baptism, '2028-01-09')
})

test('the Holy Family is December 30 when Christmas is a Sunday', () => {
  assert.equal(keyDates(2022).holyFamily, '2022-12-30')
  assert.match(day('2022-12-30').name, /Holy Family/)
})

test('Sundays and weeks of Ordinary Time are counted from both ends', () => {
  assert.equal(day('2026-01-18').name, '2nd Sunday in Ordinary Time')
  assert.equal(day('2026-02-15').name, '6th Sunday in Ordinary Time')
  assert.equal(day('2026-10-25').name, '30th Sunday in Ordinary Time')
  assert.equal(day('2026-05-27').name, 'Wednesday of the 8th Week in Ordinary Time')
  assert.equal(day('2026-11-27').name, 'Friday of the 34th Week in Ordinary Time')
})

test('All Saints on a Sunday takes the Sunday, and is a holy day', () => {
  const d = day('2026-11-01')
  assert.equal(d.name, 'All Saints'); assert.equal(d.colour, 'white'); assert.equal(d.obligation, true)
  assert.match(day('2026-11-02').name, /All Souls/); assert.equal(day('2026-11-02').colour, 'violet'); assert.equal(day('2026-11-02').rankWords, 'Commemoration')
})

test('an optional memorial is offered beside the weekday, not in its place', () => {
  const d = day('2026-11-03')
  assert.equal(d.name, 'Tuesday of the 31st Week in Ordinary Time'); assert.equal(d.optional, 'St Martin de Porres')
})

test('a memorial on a weekday of Lent becomes a commemoration', () => {
  const d = day('2026-03-07')
  assert.equal(d.name, 'Saturday of the Second Week of Lent'); assert.equal(d.optional, 'Sts Perpetua and Felicity')
  assert.equal(day('2026-03-17').optional, 'St Patrick')
})

test('a feast on a Sunday in Ordinary Time gives way, a feast of the Lord does not', () => {
  assert.equal(day('2026-10-18').name, '29th Sunday in Ordinary Time')
  assert.equal(day('2028-08-06').name, 'The Transfiguration of the Lord')
  assert.equal(day('2025-09-14').name, 'The Exaltation of the Holy Cross')
})

test('rose Sundays, violet seasons and red Palm Sunday', () => {
  assert.equal(day('2026-03-15').colour, 'rose'); assert.equal(day('2026-12-13').colour, 'rose')
  assert.equal(day('2026-12-01').colour, 'violet'); assert.equal(day('2026-03-29').colour, 'red')
  assert.equal(day('2026-03-29').name, 'Palm Sunday of the Passion of the Lord')
})

test('the Triduum and Easter', () => {
  assert.match(day('2026-04-02').name, /Holy Thursday/); assert.match(day('2026-04-03').name, /Good Friday/)
  assert.match(day('2026-04-05').name, /Easter Sunday/); assert.equal(day('2026-04-06').name, 'Monday in the Octave of Easter')
  assert.match(day('2026-04-12').name, /Divine Mercy/)
  assert.equal(day('2026-05-17').name, 'The Ascension of the Lord'); assert.equal(day('2026-05-24').colour, 'red')
  assert.equal(day('2026-05-25').name, 'The Blessed Virgin Mary, Mother of the Church')
})

test('fasting and abstinence', () => {
  assert.equal(day('2026-02-18').fasting, 'fast'); assert.equal(day('2026-04-03').fasting, 'fast')
  assert.equal(day('2026-02-27').fasting, 'abstinence')
  assert.equal(day('2027-03-19').fasting, null, 'St Joseph on a Friday of Lent lifts the abstinence')
  assert.equal(day('2026-10-30').fasting, null)
})

test('solemnities that meet a higher day move', () => {
  // The Immaculate Conception on the Second Sunday of Advent moves to Monday, without the obligation.
  assert.equal(day('2024-12-08').name, 'Second Sunday of Advent')
  assert.match(day('2024-12-09').name, /Immaculate Conception/); assert.equal(day('2024-12-09').obligation, false); assert.equal(day('2024-12-09').transferred, true)
  // The Annunciation in Holy Week moves to the Monday after Divine Mercy Sunday.
  assert.equal(day('2024-03-25').name, 'Monday of Holy Week'); assert.match(day('2024-04-08').name, /Annunciation/)
  // St Joseph on a Sunday of Lent moves to Monday; in Holy Week, to the Saturday before Palm Sunday.
  assert.match(day('2028-03-20').name, /St Joseph/); assert.doesNotMatch(day('2028-03-19').name, /St Joseph/)
  assert.match(day('2035-03-17').name, /St Joseph/)
  assert.match(day('2035-04-02').name, /Annunciation/)
  // St John the Baptist meeting the Sacred Heart goes the day before.
  assert.match(day('2022-06-24').name, /Sacred Heart/); assert.match(day('2022-06-23').name, /John the Baptist/)
})

test('the Day of Prayer for the unborn leaves a Sunday for Monday', () => {
  assert.match(day('2023-01-23').name, /Unborn/); assert.doesNotMatch(day('2023-01-22').name, /Unborn/)
  assert.match(day('2026-01-22').name, /Unborn/)
})

test('holy days of obligation, as the U.S. keeps them', () => {
  assert.equal(day('2026-12-25').obligation, true); assert.equal(day('2026-12-08').obligation, true)
  assert.equal(day('2026-08-15').obligation, false, 'Saturday'); assert.equal(day('2027-11-01').obligation, false, 'Monday')
  assert.equal(day('2028-01-01').obligation, false, 'Saturday'); assert.equal(day('2029-12-08').obligation, true, 'never lifted')
  assert.equal(day('2026-11-04').obligation, false); assert.equal(day('2026-11-08').obligation, true, 'Sunday')
})

test('late Advent weekdays and the Christmas octave', () => {
  assert.equal(day('2026-12-21').name, 'Advent Weekday, December 21'); assert.equal(day('2026-12-21').optional, 'St Peter Canisius')
  assert.equal(day('2026-12-26').name, 'St Stephen, the First Martyr')
  assert.equal(day('2026-12-29').name, 'Fifth Day in the Octave of Christmas')
  assert.match(day('2026-12-25').name, /Christmas/)
})

test('seasons and cycles', () => {
  assert.equal(seasonOf('2026-10-31'), 'ordinary'); assert.equal(seasonOf('2026-11-29'), 'advent')
  assert.equal(seasonOf('2027-01-05'), 'christmas'); assert.equal(seasonOf('2026-04-20'), 'easter')
  assert.deepEqual(cycles('2026-11-01'), { sunday: 'A', weekday: 'II' }); assert.deepEqual(cycles('2026-11-29'), { sunday: 'B', weekday: 'I' })
})

test('every day of five years has a name and a colour', () => {
  for (let y = 2025; y <= 2030; y++) {
    for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 864e5) {
      const d = new Date(t).toISOString().slice(0, 10), l = day(d)
      assert.ok(l.name && l.colourHex, d)
    }
  }
})

test('readings link to the USCCB page for the day', () => {
  assert.equal(readingsUrl('2026-11-01'), 'https://bible.usccb.org/bible/readings/110126.cfm')
})
