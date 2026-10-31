// Nothing in the app shows until someone has signed in and is on the family list
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gateState, signInProblem, codeOf } from '../src/lib/gate.js'

const session = { user: { id: 'u1', email: 'a@example.com' } }

test('signed out: the sign-in screen and nothing else', () => {
  assert.equal(gateState({ configured: true, session: null }), 'signin')
  assert.equal(gateState({ configured: true, session: undefined }), 'loading')
})

test('signed in is not enough: the family list is asked', () => {
  assert.equal(gateState({ configured: true, session, family: undefined }), 'loading')
  assert.equal(gateState({ configured: true, session, family: true }), 'open')
  assert.equal(gateState({ configured: true, session, family: false }), 'notfamily')
  assert.equal(gateState({ configured: true, session, family: null }), 'trouble')
})

test('a copy without the database: open only on the development server', () => {
  assert.equal(gateState({ configured: false, dev: true, session: null }), 'open')
  assert.equal(gateState({ configured: false, dev: false, session: null }), 'unconfigured')
})

test('a sign-in problem says what to do, and where it tried', () => {
  assert.match(signInProblem('Failed to fetch', 'abc.supabase.co'), /Couldn’t reach the database at abc\.supabase\.co/)
  assert.match(signInProblem('Load failed'), /Couldn’t reach the database/) // Safari's words
  assert.match(signInProblem('email rate limit exceeded'), /Wait a few minutes/)
  assert.match(signInProblem('Signups not allowed for otp'), /family list/)
  assert.match(signInProblem('Token has expired or is invalid'), /new one/)
  assert.equal(signInProblem(''), 'That didn’t work. Try again.')
})

test('the code from the email is its digits, six to ten of them', () => {
  assert.equal(codeOf(' 123 456 '), '123456')
  assert.equal(codeOf('12345'), null)
  assert.equal(codeOf('abc'), null)
  assert.equal(codeOf('12345678901'), null)
})

test('the app puts the gate in front of every screen, and the gate holds no place of its own', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /if \(gate\.state !== 'open'\) return <Gate gate=\{gate\} \/>/)
  const gate = readFileSync(new URL('../src/shell/Gate.jsx', import.meta.url), 'utf8')
  for (const place of ['TabBar', 'PaintingsProvider', 'Home', 'supabase.from']) assert.ok(!gate.includes(place), `the gate shows ${place}`)
})
