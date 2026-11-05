// The hand-off (CLAUDE.md, "Handing work over"): the links Jason needs to try a branch, printed by
// scripts/pre-submit.mjs. Pure, so tests run it in Node. The project ref is a public identifier, not a
// secret: it is in the Supabase URL every copy of the app carries. A clone's .env is read first, so a
// copy of this app on another project prints its own links.

export const REPO = 'jwhicks727/hicks-app'
export const PROJECT_REF = 'giuhyozekzguutczhafg'

/** The project ref from a .env's VITE_SUPABASE_URL, or null. */
export function refFromEnv(text) {
  const m = /^\s*VITE_SUPABASE_URL\s*=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/im.exec(text || '')
  return m ? m[1] : null
}

export const sqlEditor = (ref = PROJECT_REF) => `https://supabase.com/dashboard/project/${ref}/sql/new`
export const functionsPage = (ref = PROJECT_REF) => `https://supabase.com/dashboard/project/${ref}/functions`
export const fileOnBranch = (branch, path, repo = REPO) => `https://github.com/${repo}/blob/${branch.split('/').map(encodeURIComponent).join('/')}/${path}`
export const prsForBranch = (branch, repo = REPO) => `https://github.com/${repo}/pulls?q=${encodeURIComponent(`is:pr head:${branch}`)}`

/**
 * What to hand over for a branch: its pull request, each migration it adds (oldest first, the order they run),
 * the SQL editor, and the Edge Functions to deploy after the merge.
 * `added` are the paths the branch adds; `changed` every path it touches.
 */
export function handoff({ branch, added = [], changed = [], ref = PROJECT_REF, repo = REPO }) {
  const migrations = added.filter((f) => /^supabase\/migrations\/\d{14}_[\w-]+\.sql$/.test(f)).sort()
  const functions = [...new Set(changed.map((f) => (/^supabase\/functions\/([\w-]+)\//.exec(f) || [])[1]).filter((n) => n && n !== '_shared'))].sort()
  const shared = changed.some((f) => f.startsWith('supabase/functions/_shared/'))
  const lines = [`Pull request (its preview link is posted on it): ${prsForBranch(branch, repo)}`]
  if (migrations.length) {
    lines.push(`Migrations to run, in this order, once each (say what each does first):`)
    for (const m of migrations) lines.push(`  ${fileOnBranch(branch, m, repo)}`)
    lines.push(`  then paste each into the SQL editor and Run: ${sqlEditor(ref)}`)
  } else lines.push('No migration.')
  if (functions.length || shared) {
    lines.push(`After the merge, deploy: ${functions.length ? functions.join(', ') : 'every function that imports _shared'}${shared && functions.length ? ' (and every function that imports _shared)' : ''}: ${functionsPage(ref)}`)
  }
  return lines
}
