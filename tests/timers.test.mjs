// The Kitchen's timers: one for each wait a step's words name, none for the
// rest, and an ended one rings on every screen until someone stops it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stepTimers, timerTime, timerStates, timerKey, clock, RING_MS, KEEP_MS, MIN_MINUTES } from '../src/lib/kitchen/stepTimers.js'

// Steps written for the test, in the recipe format: not ours.
const t = (minutes, text) => stepTimers({ n: 1, minutes, text }).map((x) => `${x.label} ${timerTime(x)}${x.perSide ? ' a side' : ''}${x.fromStep ? ' (step)' : ''}`)

test('a step that only asks for work (chopping, whisking, heating the oven) gets no timer, whatever its heading time', () => {
  assert.deepEqual(t(5, 'Heat the oven to 425°F with a sheet pan inside. Halve the squash and scoop the seeds.'), [])
  assert.deepEqual(t(3, 'Whisk **2 Tbsp white miso** with **1 Tbsp maple syrup**.'), [])
  assert.deepEqual(t(6, 'Toss the rest of the herbs with the lemon.'), []) // "the rest of" is not resting
  assert.deepEqual(t(10, 'Cook the macaroni and drain.'), []) // a watched job with no time in its words
})

test('each wait the words name is its own timer, labelled by the word that asks for it', () => {
  assert.deepEqual(t(20, 'Simmer the sauce 10 minutes, then add the shrimp and cook 3 minutes more, until pink.'), ['Simmer 10 min', 'Cook 3 min'])
  assert.deepEqual(t(25, 'Cook on high pressure 3 minutes, then let it release naturally for 10 minutes.'), ['Pressure cook 3 min', 'Release 10 min'])
  assert.deepEqual(t(70, 'Braise, covered, 1 hour 15 minutes, until the beans are creamy. Let it rest 10 minutes before serving.'), ['Braise 1 hr 15 min', 'Rest 10 min'])
  assert.deepEqual(t(30, 'Roast the squash 25 minutes; after 10 minutes, add the salmon to the pan.'), ['Roast 25 min', 'Add the salmon 10 min'])
  assert.deepEqual(t(8, 'Let the dough rest for a 10-minute rest.'), ['Rest 10 min'])
})

test('a range runs to its low end and keeps the high one; per side is said', () => {
  const [roast] = stepTimers({ n: 2, minutes: 25, text: 'Roast 20–25 minutes, until the edges char.' })
  assert.equal(roast.minutes, 20); assert.equal(roast.upTo, 25)
  assert.deepEqual(t(10, 'Boil the pasta 8 to 10 minutes; reserve 1 cup water.'), ['Boil 8–10 min'])
  assert.deepEqual(t(35, 'Roast for 1–1½ hours, until soft.'), ['Roast 1–1½ hr'])
  assert.deepEqual(t(10, 'Sear the scallops 2 minutes per side without moving them.'), ['Sear 2 min a side'])
})

test('a time that is not a wait gets no timer: seconds, a minute, a limit, how long it keeps, a rate', () => {
  assert.deepEqual(t(5, 'Bloom the curry paste 60–90 seconds in the oil, then cook 1 minute more.'), [])
  assert.deepEqual(t(40, 'Marinate the cod at least 30 minutes or up to 2 hours.'), ['Marinate 30 min'])
  assert.deepEqual(t(15, 'Roast 15 minutes. The sauce keeps 3 days; make it up to 1 hour ahead.'), ['Roast 15 min'])
  assert.deepEqual(t(20, 'Marinate 30 minutes to 2 hours.'), ['Marinate 30 min'])
  assert.deepEqual(t(20, 'Stir every 5 minutes; add the peas for the last 5 minutes.'), [])
  assert.deepEqual(t(90, 'Roast 15 minutes per pound.'), ['Roast 1 hr 30 min (step)']) // a rate isn't a timer: the step's own time is
  assert.equal(MIN_MINUTES, 2)
})

test('a step that hands the food to the oven, a pot or the fridge with no time in its words is timed by the step', () => {
  assert.deepEqual(t(25, 'Slice the squash into half-moons, toss with **½ tsp kosher salt**, and roast until browned at the edges.'), ['Roast 25 min (step)'])
  assert.deepEqual(t(30, 'Bake at 350°F.'), ['Bake 30 min (step)'])
  assert.deepEqual(t(20, 'Chill the dough, covered.'), ['Chill 20 min (step)'])
  assert.deepEqual(t(3, 'Simmer 1 minute.'), []) // the words gave a time, too short for a timer: not the step's instead
})

test('each timer has its own name, so two in one step never replace each other', () => {
  const two = stepTimers({ n: 4, minutes: 20, text: 'Simmer 10 minutes, then cook 3 minutes more.' })
  const keys = two.map((x) => timerKey('fish-stew', 4, x.i))
  assert.deepEqual(keys, ['fish-stew:4:0', 'fish-stew:4:1'])
})

test('a timer counts down, rings once it ends, then shows quietly, then is let go', () => {
  const now = 1_000_000_000
  const list = [
    { id: 'a', ends: now + 65_000 },
    { id: 'b', ends: now - 30_000 },
    { id: 'c', ends: now - RING_MS - 1000 },
    { id: 'd', ends: now - KEEP_MS - 1000 },
    { id: 'e', ends: now + 5_000 },
  ]
  const s = timerStates(list, now)
  assert.deepEqual(s.running.map((x) => x.id), ['e', 'a']) // soonest first
  assert.equal(s.running[1].left, 65)
  assert.deepEqual(s.ringing.map((x) => x.id), ['b'])
  assert.equal(s.ringing[0].over, 30)
  assert.deepEqual(s.quiet.map((x) => x.id), ['c'])
  assert.equal(clock(65), '1:05'); assert.equal(clock(3725), '1:02:05')
})

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('the timers live in the shell, so one rings wherever the cook has gone, and not on a single page', () => {
  const app = read('src/App.jsx'), recipe = read('src/kitchen/RecipePage.jsx'), cook = read('src/kitchen/CookMode.jsx')
  assert.match(app, /<Timers \/>/)
  assert.ok(app.indexOf('<Timers />') > app.indexOf('function Inside'), 'inside the gate')
  for (const page of [recipe, cook]) {
    assert.doesNotMatch(page, /<Timers \/>/)
    assert.match(page, /<StepTimers step=\{s\}/)
    assert.doesNotMatch(page, /startTimer\(\{[^}]*minutes: s\.minutes/) // never the heading time straight to a timer
  }
})

test('an ended timer takes the screen and rings until stopped; the alarm is stilled under less motion', () => {
  const ui = read('src/kitchen/Timers.jsx'), lib = read('src/lib/kitchen/timers.js'), css = read('src/kitchen/timers.css')
  assert.match(ui, /role="alertdialog"/)
  assert.match(ui, /useAlarm\(ringing\.length > 0/)
  assert.match(lib, /setInterval\(beep, 2000\)/) // again and again, not once
  assert.match(lib, /primeSound\(\)\n {2}const now = Date\.now\(\)\n {2}const list = read\(\)/) // the starting tap wakes the sound
  assert.match(lib, /useAwake/)
  for (const sel of ['.kt-timer.soon', '.kt-dot', '.kt-alarm.ringing .kt-rings i', '.kt-alarm.ringing::before']) {
    assert.ok(css.includes(`html[data-motion="less"] ${sel}`), `${sel} stills under Settings' less motion`)
  }
  assert.match(css, /@keyframes kt-flash \{ 50% \{ opacity: [\d.]+; \} \}/) // the flash is opacity only
})

test('the recipe brief asks for each wait in the words, so new recipes time well', async () => {
  const { KITCHEN_BRIEF } = await import('../supabase/functions/_shared/claude.js')
  assert.match(KITCHEN_BRIEF, /Every wait the cook should time is said in the step's own words with its minutes/)
})
