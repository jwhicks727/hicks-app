// The pre-submit pass: the one-developer stand-in for a second reviewer (CLAUDE.md, "Branches, previews and
// merging"). Lists what the branch changes against main and prints the questions a reviewer would ask of
// those areas. Run it on the branch before asking to merge: node scripts/pre-submit.mjs
import { execFileSync } from 'node:child_process'
import { branchProblem } from './lib/branchName.mjs'

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
try { git('fetch', '--quiet', 'origin', 'main') } catch { /* offline: compare with what we have */ }
// main as GitHub has it when the clone tracks it, else the local main, else what the fetch just brought
const base = ['origin/main', 'main', 'FETCH_HEAD'].find((r) => { try { git('rev-parse', '--verify', '--quiet', r); return true } catch { return false } })
const committed = base ? git('diff', '--name-only', `${base}...HEAD`).split('\n') : []
const files = [...new Set([...committed, ...git('diff', '--name-only', 'HEAD').split('\n')])].filter(Boolean) // and anything not committed yet

const AREAS = [
  [/^supabase\/migrations\//, 'The database', [
    'Every new table has row-level security on, is granted to authenticated only, and never `using (true)`; helpers are called in a sub-select.',
    'Can one of us read or change another’s rows (a journal is its writer’s alone; Laurie’s food rules are the parents’)?',
    'Every update and delete names its rows (a where).',
    'It runs once and is additive: the preview and the live app share one database, so it must not break main when run before the merge.',
    'docs/DATABASE.md has the table and the migration.',
  ]],
  [/^supabase\/functions\//, 'Edge Functions', [
    'It checks the caller is family (or a parent) before doing anything.',
    'Outside services: a daily cap, kept answers, and the key never reaches the browser.',
    'Personal data goes to an AI service only where the screen says so.',
    'It is deployed after the merge (there is no staging copy of a function).',
  ]],
  [/^\.github\/|^scripts\/sync-|^firebase\.json$/, 'Jobs, workflows and hosting', [
    'No secret is reachable from a branch push or a pull request (only main’s environments hold them).',
    'Nothing runs more often than every 30 minutes from GitHub Actions; jobs have caps.',
    'A sync never silently deletes history.',
    'docs/SECRETS.md and README’s jobs list are up to date.',
  ]],
  [/^src\/(shell\/Gate|lib\/gate|lib\/auth)/, 'Sign-in', ['Nothing renders or reads the database before the family list says yes; the password is never kept on the device.']],
  [/^src\//, 'Screens', [
    'Checked at 390 px, at 844 × 390, on a desktop, light and dark (the preview link is for this).',
    'Touch works without hover or dragging; tap targets about 44 px; corners nearly square.',
    'No invented data, and a figure never wraps.',
  ]],
]

console.log(`Pre-submit pass for ${branch} (${files.length} files changed against main)`)
const bad = branchProblem(branch)
if (bad) console.log(`\n! ${bad}`)
for (const [re, title, asks] of AREAS) {
  const hit = files.filter((f) => re.test(f))
  if (!hit.length) continue
  console.log(`\n${title}: ${hit.slice(0, 6).join(', ')}${hit.length > 6 ? ` and ${hit.length - 6} more` : ''}`)
  for (const a of asks) console.log(`  - ${a}`)
}
console.log('\nAlways: npm test and npm run build pass; the docs the change makes wrong are fixed in this branch; the decisions log has an entry if something was decided.')
