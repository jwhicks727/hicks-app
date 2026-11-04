import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('the viewport forbids zoom', () => {
  const html = readFileSync('index.html', 'utf8')
  assert.match(html, /maximum-scale=1/)
  assert.match(html, /user-scalable=no/)
})

test('every field is at least 16px so iOS never zooms on focus', () => {
  const css = readFileSync('src/styles.css', 'utf8')
  assert.match(css, /input, textarea, select \{ font-size: max\(16px, 1em\) !important; \}/)
})
