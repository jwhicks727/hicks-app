import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeStory, relationWords, compassFrom } from '../src/lib/placeStory.js'

const fc = (temp, pic, words, o = {}) => ({ now: { temp, pic, words, gusts: 10, ...o }, today: { high: temp + 6, low: temp - 12 }, days: [{}, { words: 'Partly cloudy', high: temp + 2, low: temp - 10, rain: 10, gusts: 12 }] })
const base = { place: { name: 'Paris', line: 'The tower over the rooftops' }, home: fc(70, 'clear', 'Clear'), miles: 5620, direction: 'northeast', ahead: 540, dark: true, clock: '7:08 PM', sunWords: 'Dark out since 5:32 PM' }

test('the headline is the biggest difference from home', () => {
  assert.match(placeStory({ ...base, f: fc(55, 'rain', 'Rain') }).headline, /raining in Paris, and dry at home/)
  assert.match(placeStory({ ...base, f: fc(30, 'snow', 'Snow') }).headline, /^Snow in Paris while we’re at 70°/)
  assert.match(placeStory({ ...base, f: fc(50, 'cloudy', 'Cloudy') }).headline, /Paris is 20° colder than home/)
  assert.match(placeStory({ ...base, f: fc(92, 'clear', 'Clear'), dark: false }).headline, /22° warmer than home/)
  assert.match(placeStory({ ...base, f: fc(64, 'cloudy', 'Cloudy') }).headline, /A little cooler in Paris: 6° below home/)
  assert.match(placeStory({ ...base, f: fc(71, 'clear', 'Clear'), ahead: 0, dark: false }).headline, /much like home today, within 1°/)
  assert.match(placeStory({ ...base, f: fc(69, 'clear', 'Clear', { gusts: 38 }), ahead: 0, dark: false }).headline, /Windy in Paris: gusts to 38 mph/)
  assert.match(placeStory({ ...base, f: fc(70, 'clear', 'Clear'), home: fc(60, 'rain', 'Rain'), ahead: 0, dark: false }).headline, /Wet at home, but Paris is clear/)
})

test('the lines say the temperature against ours, the time and light there, and tomorrow', () => {
  const s = placeStory({ ...base, f: fc(52, 'cloudy', 'Cloudy') })
  assert.match(s.lines[0], /52° and cloudy there, 18° cooler than our 70°\. Today’s range: 40° to 58°/)
  assert.match(s.lines[1], /It’s 7:08 PM there \(9 hours ahead\): dark\. Dark out since 5:32 PM\./)
  assert.match(s.lines[2], /^Tomorrow: partly cloudy, 54° and 42°\.$/)
  assert.equal(s.line, 'The tower over the rooftops')
  assert.equal(placeStory({ ...base, f: null }), null)
  const near = placeStory({ ...base, f: fc(72, 'clear', 'Clear'), ahead: 0, dark: false, miles: 34, direction: 'southwest', sunWords: 'Sunset 5:05 PM' })
  assert.equal(near.lines.length, 3); assert.match(near.lines[1], /^Sunset 5:05 PM\.$/)
})

test('how far, in words', () => {
  assert.equal(relationWords({ miles: 34, direction: 'southwest', ahead: 0 }), '34 miles southwest of home')
  assert.equal(relationWords({ miles: 5617, direction: 'northeast', ahead: 540 }), '5,620 miles away, 9 hours ahead')
  assert.equal(relationWords({ miles: 2559, direction: 'west', ahead: -120 }), '2,560 miles away, 2 hours behind')
  assert.equal(compassFrom({ lat: 34.09, lng: -117.43 }, { lat: 33.81, lng: -117.92 }), 'southwest')
})
