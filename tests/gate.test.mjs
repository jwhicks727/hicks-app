// Nothing in the app shows until someone has signed in and is on the family list
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gateState, signInProblem, codeOf, passwordIssue, passwordProblem } from '../src/lib/gate.js'

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
  assert.ok(!gate.includes('type the code from the same email'), 'the screen must not promise a code the email may not hold')
  for (const place of ['TabBar', 'PaintingsProvider', 'Home', 'supabase.from']) assert.ok(!gate.includes(place), `the gate shows ${place}`)
})

test('a wrong password says what to do, and a new one has to be long enough and typed twice', () => {
  assert.match(signInProblem('Invalid login credentials'), /Email yourself a sign-in link, then set one in Settings/)
  assert.match(passwordIssue('abc', 'abc'), /at least 4/)
  assert.equal(passwordIssue('abcd', 'abcd'), null) // any four characters, no kinds required
  assert.equal(passwordIssue('1234', '1234'), null)
  assert.equal(passwordIssue('three words here', 'three words here'), null)
  assert.match(passwordIssue('three words here', 'three words there'), /don’t match/)
  assert.match(passwordIssue('me@example.com', 'me@example.com', 'ME@example.com'), /email address/)
  assert.match(passwordProblem('New password should be different from the old password.'), /already your password/)
  assert.match(passwordProblem('Password should be at least 12 characters.'), /at least 12/)
  assert.match(passwordProblem('AuthApiError: reauthentication needed'), /sign in again/)
})

test('the password is never kept on the device: only the email is a draft', () => {
  const gate = readFileSync(new URL('../src/shell/Gate.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(gate, /useDraft\([^)]*password/i)
  assert.doesNotMatch(gate, /localStorage|sessionStorage/)
  const form = readFileSync(new URL('../src/consoles/PasswordForm.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(form, /useDraft|localStorage|sessionStorage/)
})
