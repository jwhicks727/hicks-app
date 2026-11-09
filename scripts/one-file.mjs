#!/usr/bin/env node
// ============================================
// one-file.mjs -- an Edge Function as a single file, to paste into Supabase's dashboard
// ============================================
// `node scripts/one-file.mjs media > media.ts` prints the function with each
// `../_shared/*.js` module it imports set inside it, for deploying from the
// dashboard's editor (Edge Functions › Deploy a new function › Via Editor) when
// there's no computer to hand. The repository's files stay the source: the
// output is never committed, and the CLI deploy (docs/DATABASE.md) needs none of this.
// Each shared module is wrapped in its own scope, so names can't clash.
import { readFileSync } from 'node:fs'

/** The function `name` with its shared modules inlined. */
export function oneFile(name) {
  if (!/^[a-z][a-z-]*$/.test(name || '')) throw new Error('Usage: node scripts/one-file.mjs <function name>')
  const dir = new URL(`../supabase/functions/${name}/`, import.meta.url)
  const main = readFileSync(new URL('index.ts', dir), 'utf8')
  const done = new Set()
  const body = main.replace(/^import\s*\{([^}]+)\}\s*from\s*'\.\.\/_shared\/([a-z][a-z-]*)\.js'\s*;?[ \t]*$/gm, (_, names, mod) => {
    const src = readFileSync(new URL(`../_shared/${mod}.js`, dir), 'utf8')
    if (/^\s*import\s/m.test(src) || /^export\s+(default|\{|\*)/m.test(src)) throw new Error(`_shared/${mod}.js: only plain exports (const, function) can be inlined`)
    const exported = [...src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
    const ns = `__shared_${mod.replace(/-/g, '_')}`
    const picks = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const [from, to] = s.split(/\s+as\s+/)
      if (!exported.includes(from)) throw new Error(`_shared/${mod}.js has no export ${from}`)
      return to ? `${from}: ${to}` : from
    })
    const block = done.has(ns) ? '' : `// ---- from supabase/functions/_shared/${mod}.js ----\nconst ${ns} = (() => {\n${src.replace(/^export\s+/gm, '')}\nreturn { ${exported.join(', ')} }\n})()\n// ---- end of _shared/${mod}.js ----\n`
    done.add(ns)
    return `${block}const { ${picks.join(', ')} } = ${ns}`
  })
  if (/from\s*'\.\.?\//.test(body)) throw new Error('A relative import is left that this script doesn’t handle')
  return `// @ts-nocheck\n// Made by scripts/one-file.mjs from supabase/functions/${name}/ for a dashboard deploy; the repository is the source.\n${body}`
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try { process.stdout.write(oneFile(process.argv[2])) } catch (e) { console.error(e.message); process.exit(1) }
}
