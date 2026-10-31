// ============================================
// check-settings.mjs -- the GitHub variables a build needs, checked before it ships
// ============================================
// Run by the Deploy and Preview workflows (the "Check the settings are in"
// step). A wrong value there is built into the app for good: the database's
// address typed as the dashboard's (supabase.com/dashboard/...) makes every
// sign-in fail with "Failed to fetch", and a secret key in the publishable
// key's place ships inside the app for anyone to read. It prints what is
// wrong and never prints a value.
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... FIREBASE_PROJECT_ID=... node scripts/check-settings.mjs

import { pathToFileURL } from 'node:url'

const jwtRole = (key) => { try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role } catch { return null } }

/** What is wrong with these settings, in words: an empty list means they will do. */
export function problems(env) {
  const out = []
  const url = String(env.VITE_SUPABASE_URL || '').trim()
  const key = String(env.VITE_SUPABASE_ANON_KEY || '').trim()
  const project = String(env.FIREBASE_PROJECT_ID || '').trim()
  if (!url) out.push('VITE_SUPABASE_URL is empty. It is the Project URL from Supabase › Project Settings › API.')
  else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
    out.push('VITE_SUPABASE_URL should be the project\'s own address, https://<project>.supabase.co, with nothing after .supabase.co (Supabase › Project Settings › API › Project URL). It is not the dashboard\'s address (supabase.com/dashboard/...) and not one ending /rest/v1.')
  }
  if (!key) out.push('VITE_SUPABASE_ANON_KEY is empty. It is the publishable key from Supabase › Project Settings › API Keys.')
  else if (/^sb_secret_/.test(key) || jwtRole(key) === 'service_role') {
    out.push('VITE_SUPABASE_ANON_KEY holds the SECRET key. That variable is built into the app and readable by anyone, so only the publishable key goes in it. Put the publishable key there, then make a new secret key in Supabase (the old one has been shown in plain text).')
  } else if (!/^sb_publishable_/.test(key) && jwtRole(key) !== 'anon') {
    out.push('VITE_SUPABASE_ANON_KEY does not look like a publishable (anon) key. It starts sb_publishable_ (or, on an older project, is the long "anon public" key).')
  }
  if (!project) out.push('FIREBASE_PROJECT_ID is empty. It is the Firebase project\'s id, such as hicks-app-1b1a5.')
  else if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) out.push('FIREBASE_PROJECT_ID does not look like a Firebase project id (lower-case letters, digits and hyphens).')
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const found = problems(process.env)
  for (const p of found) console.error(`::error::${p}`)
  if (found.length) { console.error('Fix the variable in GitHub › Settings › Secrets and variables › Actions › Variables, then run this again (docs/MORNING.md, step 8).'); process.exit(1) }
  console.log('The settings look right.')
}
