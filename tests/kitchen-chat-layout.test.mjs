// The Ask sheet's box and buttons must not depend on how many rows it has
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/kitchen/kitchen.css', import.meta.url), 'utf8')
const rule = (sel) => { const m = css.match(new RegExp('(?:^|\\n)' + sel.replace(/[.]/g, '\\.') + ' \\{([^}]*)\\}')); return m ? m[1] : '' }

test('the chat is a column: a fixed list of grid rows put the message box in the stretchy row once the suggestions went', () => {
  assert.doesNotMatch(rule('.kchat'), /grid-template-rows/)
  assert.match(rule('.kchat'), /flex-direction: column/)
  assert.match(rule('.kchat-log'), /flex: 1 1 auto/)
})

test('the message box and its buttons keep their own height', () => {
  assert.match(rule('.kchat-in'), /align-content: start/)
  assert.match(rule('.kchat-b'), /align-items: center/)
})
