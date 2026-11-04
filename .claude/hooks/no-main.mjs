// PreToolUse hook (Bash): every change is made on a branch (CLAUDE.md, "Branches, previews and merging").
// Refuses a commit while on main, and a push to main. Exit code 2 refuses the step and tells Claude why.
import { execFileSync } from 'node:child_process'

let input = ''
process.stdin.on('data', (d) => { input += d })
process.stdin.on('end', () => {
  let cmd = ''
  try { cmd = (JSON.parse(input).tool_input || {}).command || '' } catch { process.exit(0) }
  if (!/\bgit\b/.test(cmd)) process.exit(0)
  let branch = ''
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const read = (args) => { try { return execFileSync('git', args, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return '' } }
  branch = read(['symbolic-ref', '--short', 'HEAD']) || read(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (!branch) process.exit(0)
  const commitOnMain = /\bgit\s+commit\b/.test(cmd) && branch === 'main'
  const pushToMain = /\bgit\s+push\b/.test(cmd) && (/\b(main|HEAD:main|:main)\b/.test(cmd.replace(/origin\/main/g, '')) || (branch === 'main' && !/\bgit\s+push\s+\S+\s+\S+/.test(cmd)))
  if (commitOnMain || pushToMain) {
    console.error('Changes go on a branch, never straight to main (CLAUDE.md, "Branches, previews and merging"): git checkout -b <type>/<two-words> origin/main, commit there, push it and open a draft pull request. main changes only by merging, on Jason’s word.')
    process.exit(2)
  }
  process.exit(0)
})
