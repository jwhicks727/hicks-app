import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readInvite, inviteDue, markShown, markDone, petsOpened, catFor, CATS, CAT_NAMES, MAX_DAYS, PETS_OPENED } from '../src/lib/petsInvite.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')

function fakeStorage(start = {}) {
  const m = new Map(Object.entries(start))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('the cat comes up once a day, on a few days at most, until Pets is opened or it is waved away', () => {
  const fresh = { days: [], done: false }
  assert.equal(inviteDue(fresh, '2026-11-05', false), true)
  assert.equal(inviteDue(fresh, '2026-11-05', true), false, 'Pets already opened on this device')
  assert.equal(inviteDue({ days: ['2026-11-05'], done: false }, '2026-11-05', false), false, 'once a day')
  assert.equal(inviteDue({ days: ['2026-11-05'], done: false }, '2026-11-06', false), true, 'and again the next day')
  assert.equal(inviteDue({ days: [], done: true }, '2026-11-06', false), false, 'waved away for good')
  const many = Array.from({ length: MAX_DAYS }, (_, i) => `2026-11-0${i + 1}`)
  assert.equal(inviteDue({ days: many, done: false }, '2026-11-20', false), false, `no more than ${MAX_DAYS} days`)
})

test('what the device remembers, and a broken store never breaks Home', () => {
  const s = fakeStorage()
  assert.deepEqual(readInvite(s), { days: [], done: false })
  markShown(s, '2026-11-05')
  markShown(s, '2026-11-05')
  assert.deepEqual(readInvite(s), { days: ['2026-11-05'], done: false }, 'a day counts once')
  markDone(s)
  assert.deepEqual(readInvite(s), { days: ['2026-11-05'], done: true })
  assert.deepEqual(readInvite(fakeStorage({ 'teamhicks.pets.invite': '{oops' })), { days: [], done: false })
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.deepEqual(readInvite(blocked), { days: [], done: false })
  assert.equal(petsOpened(blocked), false)
  assert.doesNotThrow(() => { markShown(blocked, '2026-11-05'); markDone(blocked) })
  assert.equal(petsOpened(fakeStorage({ [PETS_OPENED]: '1' })), true)
})

test('the three cats take turns, one a day, by the calendar date', () => {
  const seen = ['2026-11-05', '2026-11-06', '2026-11-07'].map(catFor)
  assert.deepEqual([...seen].sort(), [...CATS].sort(), 'three days, three different cats')
  assert.equal(catFor('2026-11-08'), catFor('2026-11-05'))
  assert.equal(catFor('2026-12-31') !== catFor('2027-01-01'), true, 'turns carry over the new year')
  for (const c of CATS) assert.ok(CAT_NAMES[c])
})

test('opening Pets answers the invitation: the launch and the invite share one mark', () => {
  const launch = read('src/places/pets/PetsLaunch.jsx')
  assert.match(launch, /from '..\/..\/lib\/petsInvite.js'/)
  assert.match(launch, /localStorage\.setItem\(PETS_OPENED, '1'\)/)
  assert.doesNotMatch(launch, /'teamhicks\.pets\.launched'/, 'the key lives in one place')
})

test('the invite: on Home, drawn at the top of the page, a real link to /pets, a way to wave it away, and still under less motion', () => {
  assert.match(read('src/places/Home.jsx'), /<PetsInvite today=\{today\} \/>/)
  const jsx = read('src/places/pets/PetsInvite.jsx')
  assert.match(jsx, /createPortal\(/, 'a portal, so no card’s entrance animation pins it')
  assert.match(jsx, /<Link to="\/pets" className="pi-say"/)
  assert.match(jsx, /aria-label="Not now"/)
  assert.match(jsx, /onClickCapture=\{answered\}/, 'never onClick on a Link: that would replace its own navigation')
  assert.match(jsx, /reducedMotion\(\)/)
  const css = read('src/places/pets/pets-invite.css')
  const rules = css.replace(/\/\*[^]*?\*\//g, '').replace(/[\d.]+(px|s|%|deg)?/g, ' ')
  for (const [, cls] of rules.matchAll(/\.([a-z][\w-]*)/g)) assert.ok(/^(pi|pt)-/.test(cls) || ['pi'].includes(cls), `.${cls} carries the pi- prefix (or is the cat’s own pt- part)`)
  for (const [, name] of css.matchAll(/@keyframes\s+([\w-]+)/g)) assert.ok(name.startsWith('pi-'), `@keyframes ${name}`)
  assert.match(css, /\.pi-still \.pi-cat/, 'less motion: it appears, still')
  assert.match(css, /bottom: calc\(var\(--tab-bottom\) \+ var\(--tabbar\)\)/, 'on the tab bar’s top edge, which already keeps clear of the home indicator')
  assert.match(css, /env\(safe-area-inset-left/)
  assert.match(css, /@media \(pointer: coarse\) \{ \.pi-x \{ width: 44px; height: 44px/)
  assert.doesNotMatch(css, /filter:\s*blur/)
})
