import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pickLatest, FALLBACK_SONNET, costCents, overCap, checkUpload, checkHistory, TASKS, kitchenTools, kitchenNow, planAsk, IDEAS_SCHEMA, RECIPES_SCHEMA, EVENTS_SCHEMA, GARDEN_SCHEMA } from '../supabase/functions/_shared/claude.js'

test('the latest active Sonnet, whatever it is called, never a retired one', () => {
  const models = [
    { id: 'claude-sonnet-5', created_at: '2026-03-01T00:00:00Z', status: 'active' },
    { id: 'claude-opus-5-5', created_at: '2026-09-01T00:00:00Z', status: 'active' },
    { id: 'claude-sonnet-5-5', created_at: '2026-08-01T00:00:00Z', status: 'active' },
    { id: 'claude-sonnet-6', created_at: '2027-02-01T00:00:00Z', status: 'deprecated', deprecated_at: '2027-03-01T00:00:00Z' },
  ]
  assert.equal(pickLatest(models), 'claude-sonnet-5-5')
  assert.equal(pickLatest([...models, { id: 'claude-sonnet-6-1', created_at: '2027-05-01T00:00:00Z', status: 'active' }]), 'claude-sonnet-6-1')
  assert.equal(pickLatest([]), null)
  assert.match(FALLBACK_SONNET, /^claude-sonnet-/)
})

test('no model version is written into the app or the function except the one fallback', () => {
  const files = ['supabase/functions/claude/index.ts', 'src/lib/claude.js']
  for (const f of files) assert.doesNotMatch(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /claude-(sonnet|opus|haiku|fable)-\d/, f)
})

test('cost counts every attempt and the cache; the caps hold', () => {
  assert.equal(costCents({ input_tokens: 1e6, output_tokens: 0 }), 200)
  assert.equal(costCents({ input_tokens: 0, output_tokens: 1e5 }), 100)
  assert.equal(costCents({ iterations: [{ input_tokens: 5e5, output_tokens: 0 }, { input_tokens: 5e5, output_tokens: 0 }] }), 200)
  assert.equal(costCents({ cache_read_input_tokens: 1e6 }), 20)
  assert.equal(overCap({ today_cents: 10, month_cents: 100 }), null)
  assert.match(overCap({ today_cents: 300, month_cents: 400 }), /Today/)
  assert.match(overCap({ today_cents: 1, month_cents: 3000 }), /month/)
})

test('only pictures (and PDFs where a task takes them), whole and not too big', () => {
  const small = { data: 'QUJD', media_type: 'image/jpeg' }
  assert.equal(checkUpload(small), null)
  assert.match(checkUpload({ data: 'QUJD', media_type: 'application/pdf' }), /picture/)
  assert.equal(checkUpload({ data: 'QUJD', media_type: 'application/pdf' }, { pdf: true }), null)
  assert.match(checkUpload({ data: 'not base64!', media_type: 'image/png' }), /whole/)
  assert.match(checkUpload({ data: 'A'.repeat(8 * 1024 * 1024), media_type: 'image/png' }), /5 MB/)
  assert.match(checkUpload({ data: 'QUJD', media_type: 'text/html' }), /picture/)
})

test('a conversation starts and ends with the person, and stays a sane size', () => {
  assert.equal(checkHistory([{ role: 'user', content: 'Hi' }]), null)
  assert.match(checkHistory([]), /1 to 60/)
  assert.match(checkHistory([{ role: 'assistant', content: 'x' }, { role: 'user', content: 'y' }]), /start/)
  assert.match(checkHistory([{ role: 'system', content: 'x' }]), /start and end|yours/)
  assert.match(checkHistory([{ role: 'user', content: [{ type: 'image', source: { data: 'x!', media_type: 'image/png' } }] }]), /whole/)
})

test('who may ask what: the planning is the parents’; the rules tool only when shared', () => {
  for (const k of ['plan-week', 'write-recipes', 'recipe-from-image', 'calendar-from-image']) assert.equal(TASKS[k].who, 'parent', k)
  assert.equal(TASKS['kitchen-chat'].who, 'family'); assert.equal(TASKS['garden-photo'].who, 'family')
  assert.ok(!kitchenTools().some((t) => t.name === 'propose_food_rules'))
  assert.ok(kitchenTools({ canRules: true }).some((t) => t.name === 'propose_food_rules'))
  for (const t of kitchenTools({ canRules: true })) { assert.equal(t.strict, true); assert.equal(t.input_schema.additionalProperties, false) }
  assert.match(kitchenNow({ today: '2026-11-01' }), /not shared/)
  assert.match(kitchenNow({ today: '2026-11-01', rules: 'No X' }), /with her permission/)
  assert.match(planAsk({ count: 50, asked: 'and three breakfasts' }), /^Give 20 .*three breakfasts/s)
})

test('every schema is closed and names what it requires', () => {
  const walk = (s) => {
    if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort()); Object.values(s.properties).forEach(walk) }
    if (s.type === 'array') walk(s.items)
  }
  for (const s of [IDEAS_SCHEMA, RECIPES_SCHEMA, EVENTS_SCHEMA, GARDEN_SCHEMA]) walk(s)
})

test('the kitchen brief keeps the fish to what a Southern California supermarket stocks, and never trout', async () => {
  const { KITCHEN_BRIEF } = await import('../supabase/functions/_shared/claude.js')
  assert.match(KITCHEN_BRIEF, /Fish and shellfish: only kinds an ordinary Southern California supermarket stocks all year/)
  assert.match(KITCHEN_BRIEF, /Never trout/)
})
