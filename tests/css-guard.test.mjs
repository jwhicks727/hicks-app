import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Every stylesheet lands in one bundle, so a name used twice silently wins
// or loses: the glow's sparks once took over the entrance animation and every
// card on every screen faded to nothing (docs/DECISIONS-LOG.md).
const files = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.css')) files.push(p) } }
walk(new URL('../src', import.meta.url).pathname)

test('no @keyframes name is defined twice across the stylesheets', () => {
  const seen = new Map()
  for (const f of files) {
    for (const [, name] of readFileSync(f, 'utf8').matchAll(/@keyframes\s+([\w-]+)/g)) {
      assert.ok(!seen.has(name), `@keyframes ${name} is in both ${seen.get(name)} and ${f}`)
      seen.set(name, f)
    }
  }
  assert.ok(seen.size > 5)
})

test('no blur filter: iPhones repaint one slowly (CLAUDE.md, The look)', () => {
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /filter:\s*blur\(|backdrop-filter:\s*blur\((?:[3-9]\d|\d{3})/, f)
})
