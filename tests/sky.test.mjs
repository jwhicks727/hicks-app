import { test } from 'node:test'
import assert from 'node:assert/strict'
import { phaseOf, greeting, lengthWords, moonLitPath, moonName, bearing } from '../src/lib/sky.js'

const day = (h, m = 0) => new Date(Date.UTC(2026, 9, 31, h + 7, m)) // Pacific daylight time
const times = { dawn: day(6, 44), sunrise: day(7, 9), goldenHourEnd: day(7, 50), goldenHour: day(17, 23), sunsetStart: day(17, 55), sunset: day(17, 58), dusk: day(18, 24) }

test('the phases of the day follow the sun', () => {
  assert.equal(phaseOf(day(3), times), 'night')
  assert.equal(phaseOf(day(6, 50), times), 'dawn')
  assert.equal(phaseOf(day(7, 30), times), 'morning')
  assert.equal(phaseOf(day(12), times), 'day')
  assert.equal(phaseOf(day(17, 30), times), 'golden')
  assert.equal(phaseOf(day(18, 5), times), 'sunset')
  assert.equal(phaseOf(day(18, 20), times), 'dusk')
  assert.equal(phaseOf(day(22), times), 'night')
})

test('evening runs to midnight, so the app never says goodbye by mistake', () => {
  assert.equal(greeting(4), 'Good night')
  assert.equal(greeting(9), 'Good morning')
  assert.equal(greeting(14), 'Good afternoon')
  assert.equal(greeting(23), 'Good evening')
})

test('a shadow is said in words', () => {
  assert.equal(lengthWords(1), 'about as long as you are tall')
  assert.equal(lengthWords(1.44), 'about 1.4 times your height')
  assert.equal(lengthWords(21.3), 'about 21 times your height')
})

test('the moon is drawn lit from the right, full and new at the ends', () => {
  assert.match(moonLitPath(0.5, 32), /A0\.00 32/)
  assert.match(moonLitPath(1, 32), / 0 0 1 0 -32Z$/)
  assert.equal(moonName(0.5), 'Full moon')
  assert.equal(moonName(0.66), 'Waning gibbous')
})

test('SunCalc azimuth becomes a bearing from north', () => {
  assert.equal(bearing(0), 180)
  assert.equal(Math.round(bearing(Math.PI / 2)), 270)
})
