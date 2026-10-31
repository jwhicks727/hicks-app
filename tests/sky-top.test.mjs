// The fade under the status bar
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const sky = readFileSync(new URL('../src/shell/Sky.jsx', import.meta.url), 'utf8')

test('the strip is as tall as the safe area asks (nothing on a computer), fades out, and sits under the sheets', () => {
  const rule = css.match(/\.sky-top \{([^}]*)\}/)[1]
  assert.match(rule, /height: calc\(env\(safe-area-inset-top, 0px\) \* 1\.\d+\)/)
  assert.match(rule, /mask-image: linear-gradient\(to bottom, #000 0, #000 \d+%, transparent 100%\)/)
  const z = Number(rule.match(/z-index: (\d+)/)[1])
  assert.ok(z > 0 && z < 20, 'above the page, below the tab bar (20), the scrims (50) and the sheets (70)')
})

test('it shows only once the page has scrolled, and copies the same sky', () => {
  assert.match(css, /\.sky-top \{[^}]*opacity: 0/)
  assert.match(css, /\.sky-top\.on \{ opacity: 1; \}/)
  assert.match(sky, /window\.scrollY > \d+/)
  assert.match(sky, /className=\{'sky-top' \+ \(scrolled \? ' on' : ''\)\}/)
  assert.match(sky, /backgroundSize: '100% 100lvh'/)
})
