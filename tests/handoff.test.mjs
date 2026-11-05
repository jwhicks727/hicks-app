import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { handoff, refFromEnv, sqlEditor, fileOnBranch, PROJECT_REF } from '../scripts/lib/handoff.mjs'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')

test('the project ref comes from a .env when there is one', () => {
  assert.equal(refFromEnv('VITE_SUPABASE_PUBLISHABLE_KEY=x\nVITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co\n'), 'abcdefghijklmnopqrst')
  assert.equal(refFromEnv('VITE_SUPABASE_URL="https://qwertyuiopasdfghjklz.supabase.co"'), 'qwertyuiopasdfghjklz')
  assert.equal(refFromEnv('nothing here'), null)
  assert.equal(refFromEnv(undefined), null)
})

test('a branch with migrations hands over each file, oldest first, and the SQL editor', () => {
  const lines = handoff({
    branch: 'feat/journal-doc-sync',
    added: ['src/x.js', 'supabase/migrations/20261106010000_b.sql', 'supabase/migrations/20261105230000_a.sql'],
    changed: [],
    ref: 'abcdefghijklmnopqrst',
  })
  const text = lines.join('\n')
  assert.match(text, /pulls\?q=is%3Apr%20head%3Afeat%2Fjournal-doc-sync/)
  const a = text.indexOf('blob/feat/journal-doc-sync/supabase/migrations/20261105230000_a.sql')
  const b = text.indexOf('blob/feat/journal-doc-sync/supabase/migrations/20261106010000_b.sql')
  assert.ok(a > 0 && b > a, 'in the order they run')
  assert.match(text, /https:\/\/supabase\.com\/dashboard\/project\/abcdefghijklmnopqrst\/sql\/new/)
  assert.doesNotMatch(text, /No migration/)
})

test('no migration is said plainly, and changed functions are named for after the merge', () => {
  const none = handoff({ branch: 'fix/thing-here', added: ['src/a.js'], changed: ['src/a.js'] })
  assert.ok(none.includes('No migration.'))
  assert.ok(!none.some((l) => /deploy/.test(l)))
  const fn = handoff({ branch: 'fix/thing-here', changed: ['supabase/functions/claude/index.ts', 'supabase/functions/_shared/claude.js'] })
  assert.ok(fn.some((l) => /After the merge, deploy: claude \(and every function that imports _shared\)/.test(l)))
})

test('the links are the right shape', () => {
  assert.equal(sqlEditor(), `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
  assert.equal(fileOnBranch('feat/a-b', 'supabase/migrations/x.sql'), 'https://github.com/jwhicks727/hicks-app/blob/feat/a-b/supabase/migrations/x.sql')
})

test('CLAUDE.md makes the hand-off a step of every branch, with the same SQL editor link, and the pre-submit pass prints it', () => {
  const rules = read('CLAUDE.md')
  assert.match(rules, /### Handing work over \(every branch, every session\)/)
  assert.ok(rules.includes(sqlEditor()), 'the SQL editor link in CLAUDE.md is the one the script prints')
  assert.match(rules, /5\. \*\*Hand it over\*\*/)
  const pre = read('scripts/pre-submit.mjs')
  assert.match(pre, /from '\.\/lib\/handoff\.mjs'/)
  assert.match(pre, /handoff\(\{ branch, added, changed: files, ref \}\)/)
})
