import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { branchProblem } from '../scripts/lib/branchName.mjs'

test('a branch is named for its work: <type>/<two or more words>, and never main', () => {
  for (const ok of ['feat/calendar-month-view', 'fix/kitchen-menu-corners', 'chore/branch-preview-pipeline', 'hotfix/sign-in-loop']) assert.equal(branchProblem(ok), null, ok)
  assert.match(branchProblem('main'), /never happens on main/)
  assert.match(branchProblem('claude/pensive-tesla-ty9pf9'), /start with a type/)
  assert.match(branchProblem('feat/menu'), /two or more/)
  assert.match(branchProblem('Feat/Big-Menu'), /type/)
  assert.match(branchProblem('feat/' + 'a-'.repeat(40) + 'b'), /at most 60/)
})

const hook = fileURLToPath(new URL('../.claude/hooks/no-main.mjs', import.meta.url))
const run = (command, branch) => {
  // A throwaway repository on the branch given, so the hook reads that branch
  const dir = fs.mkdtempSync(fileURLToPath(new URL('../node_modules/.cache-hook-', import.meta.url)))
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: dir })
  try { execFileSync('node', [hook], { input: JSON.stringify({ tool_input: { command } }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: ['pipe', 'pipe', 'pipe'] }); return 0 } catch (e) { return e.status } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

test('the hook refuses a commit on main and a push to main, and lets branch work through', () => {
  assert.equal(run('git commit -m "x"', 'main'), 2)
  assert.equal(run('git push -u origin main', 'feat/some-work'), 2)
  assert.equal(run('git push', 'main'), 2)
  assert.equal(run('git commit -m "x"', 'feat/some-work'), 0)
  assert.equal(run('git push -u origin feat/some-work', 'feat/some-work'), 0)
  assert.equal(run('git fetch origin main && git checkout -b fix/two-words origin/main', 'main'), 0, 'starting a branch from main is fine')
  assert.equal(run('npm test', 'main'), 0)
})
