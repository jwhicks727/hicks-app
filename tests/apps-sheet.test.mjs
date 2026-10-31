// The Apps sheet leaves the tab bar in view, and a tab still works under it
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const bar = readFileSync(new URL('../src/shell/TabBar.jsx', import.meta.url), 'utf8')

test('the sheet ends above the floating tab bar, by the same two numbers the bar is placed with', () => {
  assert.match(css, /\.sheet-scrim:has\(\.apps-sheet\) \{ bottom: calc\(var\(--tab-bottom\) \+ var\(--tabbar\) \+ \d+px\); \}/)
  assert.match(css, /--tabbar: \d+px;/)
  assert.match(css, /--tab-bottom: calc\(\d+px \+ env\(safe-area-inset-bottom, 0px\) \* \.\d+\)/)
  assert.match(css, /\.tabs \{[^}]*bottom: var\(--tab-bottom\)/)
})

test('everything that floats above the bar uses the same two numbers', () => {
  const kitchen = readFileSync(new URL('../src/kitchen/kitchen.css', import.meta.url), 'utf8')
  for (const sel of ['\\.timers', '\\.kchat-fab']) assert.match(kitchen.match(new RegExp(sel + ' \\{[^}]*\\}'))[0], /bottom: calc\(var\(--tab-bottom\) \+ var\(--tabbar\)/)
  assert.match(css, /\.sky-bg \{[^}]*min-height: 100lvh/)
})

test('a tab tapped under the sheet closes it and goes on in the sheet’s own step of history', () => {
  assert.match(bar, /onClickCapture=\{fromSheet\}/)
  assert.match(bar, /navigateFromSheet\(a\.getAttribute\('href'\)\)/)
  assert.match(bar, /open \? window\.history\.back\(\) : setOpen\(true\)/) // the Apps tab again closes it
})
