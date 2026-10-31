// Guards SOAR learned the hard way, for every migration in supabase/migrations.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const sql = files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8').replace(/--.*$/gm, '')])
const all = sql.map(([, s]) => s).join('\n')

test('migrations are named by UTC timestamp, never "the next number", and never reuse one', () => {
  for (const f of files) assert.match(f, /^\d{14}_[a-z0-9_]+\.sql$/, `${f}: name it yyyymmddhhmmss_short_description.sql`)
  const stamps = files.map((f) => f.slice(0, 14))
  assert.equal(new Set(stamps).size, stamps.length, 'two migrations share a timestamp')
})

const tables = [...all.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(public\.\w+)/gi)].map((m) => m[1].toLowerCase())

test('every table has row-level security switched on', () => {
  for (const t of tables) assert.match(all, new RegExp(`alter\\s+table\\s+${t.replace('.', '\\.')}\\s+enable\\s+row\\s+level\\s+security`, 'i'), `${t} has no row-level security`)
})

test('every table is granted explicitly (new tables are not exposed automatically here)', () => {
  for (const t of tables) assert.match(all, new RegExp(`grant[^;]+on[^;]*${t.replace('.', '\\.')}[^;]*to\\s+authenticated`, 'i'), `${t} is never granted to authenticated`)
})

test('never using (true): a signed-in stranger must see nothing', () => {
  for (const [f, s] of sql) assert.doesNotMatch(s, /(using|with\s+check)\s*\(\s*true\s*\)/i, `${f} has using (true)`)
})

test('nothing is granted to the anonymous key', () => {
  for (const [f, s] of sql) assert.doesNotMatch(s, /grant[^;]+to\s+anon\b/i, `${f} grants to anon`)
})

test('every update and delete names its rows (Supabase rejects one without a where, but only live)', () => {
  for (const [f, s] of sql) {
    for (const m of s.matchAll(/\b(update|delete\s+from)\s+[\w.]+[^;]*;/gi)) {
      if (/^update\s+on\b/i.test(m[0]) || /before\s+update|after\s+update|for\s+update/i.test(s.slice(Math.max(0, m.index - 30), m.index + 10))) continue
      assert.match(m[0], /\bwhere\b/i, `${f}: "${m[0].slice(0, 60)}" has no where`)
    }
  }
})
