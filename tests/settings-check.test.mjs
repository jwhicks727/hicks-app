// The build's settings are checked before they are built in for good
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { problems } from '../scripts/check-settings.mjs'

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (role) => `${b64({ alg: 'HS256' })}.${b64({ role, iss: 'supabase' })}.sig`
const good = { VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc123', FIREBASE_PROJECT_ID: 'hicks-app-1b1a5' }

test('right settings pass, a trailing slash and an older anon key too', () => {
  assert.deepEqual(problems(good), [])
  assert.deepEqual(problems({ ...good, VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co/', VITE_SUPABASE_ANON_KEY: jwt('anon') }), [])
})

test('the dashboard’s address, or one with a path, is not the database’s', () => {
  for (const url of ['https://supabase.com/dashboard/project/abcdefghijklmnopqrst', 'https://abcdefghijklmnopqrst.supabase.co/rest/v1/', 'abcdefghijklmnopqrst.supabase.co', 'http://abcdefghijklmnopqrst.supabase.co']) {
    const p = problems({ ...good, VITE_SUPABASE_URL: url })
    assert.equal(p.length, 1, url)
    assert.match(p[0], /VITE_SUPABASE_URL/)
  }
})

test('a secret key in the publishable key’s place is refused, and never echoed', () => {
  for (const key of ['sb_secret_abcdef0123456789', jwt('service_role')]) {
    const p = problems({ ...good, VITE_SUPABASE_ANON_KEY: key })
    assert.equal(p.length, 1)
    assert.match(p[0], /SECRET key/)
    assert.ok(!p[0].includes(key))
  }
})

test('empty or odd settings say which one', () => {
  assert.equal(problems({}).length, 3)
  assert.match(problems({ ...good, VITE_SUPABASE_ANON_KEY: 'hello' })[0], /does not look like/)
  assert.match(problems({ ...good, FIREBASE_PROJECT_ID: 'Hicks App' })[0], /FIREBASE_PROJECT_ID/)
})
