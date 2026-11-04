// The Preview workflow's first step: a pull request's branch is named for its work (scripts/lib/branchName.mjs).
// Locally: node scripts/check-branch.mjs (reads the current branch).
import { execFileSync } from 'node:child_process'
import { branchProblem } from './lib/branchName.mjs'

const name = process.env.BRANCH || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim()
const problem = branchProblem(name)
if (problem) { console.error(problem); process.exit(1) }
console.log(`Branch name is fine: ${name}`)
