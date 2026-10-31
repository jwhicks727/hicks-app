// The Apps sheet leaves the tab bar in view, and a tab still works under it
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const bar = readFileSync(new URL('../src/shell/TabBar.jsx', import.meta.url), 'utf8')

test('the sheet ends above the floating tab bar', () => {
  const m = css.match(/\.sheet-scrim:has\(\.apps-sheet\) \{ bottom: calc\((\d+)px/)
  assert.ok(m, 'the Apps sheet needs its own bottom edge')
  assert.ok(Number(m[1]) >= 76, 'the tab bar is about 66px tall and 10px up: the sheet must end above 76px')
})

test('a tab tapped under the sheet closes it and goes on in the sheet’s own step of history', () => {
  assert.match(bar, /onClickCapture=\{fromSheet\}/)
  assert.match(bar, /navigateFromSheet\(a\.getAttribute\('href'\)\)/)
  assert.match(bar, /open \? window\.history\.back\(\) : setOpen\(true\)/) // the Apps tab again closes it
})
