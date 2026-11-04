// branchName.mjs -- the rule for a branch's name (CLAUDE.md, "Branches, previews and merging"):
// <type>/<two or more words>, lower case with hyphens, at most 60 characters. Shared by the
// Preview workflow's check, the hook and the tests.
export const TYPES = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf', 'ci', 'hotfix']

/** What is wrong with a branch's name, in a sentence, or null when it is fine. `main` is never a branch to work on. */
export function branchProblem(name) {
  const n = String(name || '').trim()
  if (!n) return 'There is no branch name.'
  if (n === 'main' || n === 'master') return 'Work never happens on main: start a branch (git checkout -b feat/two-words origin/main).'
  if (n.length > 60) return `“${n}” is ${n.length} characters; a branch name is at most 60.`
  const m = n.match(/^([a-z]+)\/(.+)$/)
  if (!m || !TYPES.includes(m[1])) return `“${n}” should start with a type and a slash: ${TYPES.join(', ')} (for example feat/calendar-month-view).`
  if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(m[2])) return `“${n}” should say what the work is in two or more lower-case words joined by hyphens (for example fix/kitchen-menu-corners).`
  return null
}
