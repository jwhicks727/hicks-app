import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { AREAS, OPS, MAX_OPS, MAX_EXPIRES, validPath, validMember, r2Key, decide, checkOp, linkSeconds, uriEncode, presign, r2Link } from '../supabase/functions/_shared/media.js'
import { MEDIA_AREAS, matchesCopy, sizeWords, drawingOwners } from '../src/lib/mediaMove.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('a signed link matches Amazon’s own published example to the character', async () => {
  // S3 documentation, "Authenticating Requests: Using Query Parameters (AWS Signature Version 4)"
  const url = await presign({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', region: 'us-east-1', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', expires: 86400, date: new Date('2013-05-24T00:00:00Z') })
  assert.equal(url, 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404')
})

test('an R2 link names the family’s bucket, signs the headers it must be sent with, and changes if they do', async () => {
  const cfg = { accountId: 'acct123', bucket: 'hicks-media', accessKeyId: 'KEY', secretAccessKey: 'SECRET' }
  const date = new Date('2026-11-09T12:00:00Z')
  const get = await r2Link(cfg, 'GET', 'paintings/old-barn/full.jpg', 3600, {}, date)
  assert.match(get, /^https:\/\/acct123\.r2\.cloudflarestorage\.com\/hicks-media\/paintings\/old-barn\/full\.jpg\?/)
  assert.match(get, /X-Amz-Credential=KEY%2F20261109%2Fauto%2Fs3%2Faws4_request/); assert.match(get, /X-Amz-Expires=3600/)
  const put = await r2Link(cfg, 'PUT', 'drawings/a.jpg', 900, { 'content-type': 'image/jpeg', 'x-amz-meta-owner': 'u1' }, date)
  assert.match(put, /X-Amz-SignedHeaders=content-type%3Bhost%3Bx-amz-meta-owner/, 'the type and the owner are part of what’s signed')
  const other = await r2Link(cfg, 'PUT', 'drawings/a.jpg', 900, { 'content-type': 'image/jpeg', 'x-amz-meta-owner': 'u2' }, date)
  assert.notEqual(put.split('X-Amz-Signature=')[1], other.split('X-Amz-Signature=')[1], 'another owner, another signature')
  assert.notEqual(get.split('X-Amz-Signature=')[1], (await r2Link(cfg, 'HEAD', 'paintings/old-barn/full.jpg', 3600, {}, date)).split('X-Amz-Signature=')[1], 'a link to look is not a link to fetch')
  assert.equal(uriEncode("a b!'()*~"), 'a%20b%21%27%28%29%2A~')
})

test('each area keeps its old bucket’s rules: who sees, who adds, who takes away', () => {
  const kid = { family: true, parent: false }, mum = { family: true, parent: true }, stranger = { family: false, parent: false }
  for (const area of Object.keys(AREAS)) {
    for (const op of OPS) assert.equal(decide(op, area, stranger), 'no', `${area} ${op}: a stranger gets nothing`)
    assert.equal(decide('get', area, kid), 'yes'); assert.equal(decide('head', area, kid), 'yes')
  }
  assert.deepEqual(['paintings', 'academy'].map((a) => [decide('put', a, kid), decide('delete', a, kid), decide('put', a, mum), decide('delete', a, mum)]), [['no', 'no', 'yes', 'yes'], ['no', 'no', 'yes', 'yes']])
  for (const a of ['garden', 'trips']) assert.deepEqual([decide('put', a, kid), decide('delete', a, kid)], ['yes', 'yes'])
  assert.deepEqual([decide('put', 'drawings', kid), decide('delete', 'drawings', kid), decide('delete', 'drawings', mum)], ['yes', 'owner', 'yes'], 'a drawing comes down by whoever added it, or a parent')
  assert.equal(decide('put', 'journal', mum), 'no', 'no area the app doesn’t have'); assert.equal(decide('list', 'paintings', mum), 'no')
  assert.equal(AREAS.paintings.overwrite, true); for (const a of ['drawings', 'trips', 'garden', 'academy']) assert.equal(AREAS[a].overwrite, false, `${a} files are added, never written over`)
})

test('the areas’ types and sizes are exactly what the Supabase buckets allowed (read from the migrations)', () => {
  const dir = new URL('../supabase/migrations/', import.meta.url)
  const all = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n')
  const buckets = Object.fromEntries([...all.matchAll(/values \('(\w+)', '\w+', false, (\d+), array\[([^\]]+)\]\)/g)].map((m) => [m[1], { bytes: Number(m[2]), types: m[3].split(',').map((t) => t.trim().replace(/'/g, '')) }]))
  assert.deepEqual(Object.keys(buckets).sort(), Object.keys(AREAS).sort(), 'one area for each bucket, and no more')
  for (const [name, b] of Object.entries(buckets)) {
    assert.equal(AREAS[name].maxBytes, b.bytes, `${name}: size`)
    assert.deepEqual([...AREAS[name].types].sort(), [...b.types].sort(), `${name}: types`)
  }
  assert.deepEqual(MEDIA_AREAS.map(([a]) => a).sort(), Object.keys(AREAS).sort(), 'the move covers every area')
})

test('only paths the app makes, and only sensible asks, get a link', () => {
  for (const ok of ['old-barn/full.jpg', 'inbox/1b2c/kept.jpg', 'a1b2.thumb.jpg', 'spot-1/x_2.jpg', 'a.webp']) assert.ok(validPath(ok), ok)
  for (const bad of ['', '/abs.jpg', '../up.jpg', 'a/../b.jpg', 'a//b.jpg', 'a b.jpg', '.hidden', 'a/', 'x'.repeat(301), 'a\\b.jpg', null, 7]) assert.ok(!validPath(bad), String(bad))
  assert.equal(r2Key('drawings', 'a.jpg'), 'drawings/a.jpg')
  assert.equal(checkOp({ op: 'get', area: 'paintings', path: 'old-barn/full.jpg' }), null)
  assert.match(checkOp({ op: 'list', area: 'paintings', path: 'x.jpg' }), /Unknown op/)
  assert.match(checkOp({ op: 'get', area: 'journal', path: 'x.jpg' }), /Unknown area/)
  assert.match(checkOp({ op: 'get', area: 'paintings', path: '../x.jpg' }), /path/)
  assert.match(checkOp({ op: 'put', area: 'drawings', path: 'a.jpg', type: 'image/png', size: 10 }), /image\/jpeg/)
  assert.match(checkOp({ op: 'put', area: 'drawings', path: 'a.jpg', type: 'image/jpeg' }), /size/)
  assert.match(checkOp({ op: 'put', area: 'academy', path: 'a.png', type: 'image/png', size: 3 * 1024 * 1024 }), /over 2 MB/)
  assert.equal(checkOp({ op: 'put', area: 'paintings', path: 'x/leaves.png', type: 'image/png', size: 1000 }), null)
  assert.equal(linkSeconds(), 3600); assert.equal(linkSeconds(5), 60); assert.equal(linkSeconds(30 * 86400), MAX_EXPIRES); assert.equal(linkSeconds(7 * 86400), 604800)
  assert.ok(MAX_OPS >= 100 && MAX_OPS <= 500)
})

test('the move: a copy counts only when it’s there and the same size, and sizes read plainly', () => {
  assert.equal(matchesCopy({ size: 1200 }, { exists: true, size: 1200 }), true)
  assert.equal(matchesCopy({ size: 1200 }, { exists: true, size: 1199 }), false, 'a short copy isn’t a copy')
  assert.equal(matchesCopy({ size: 1200 }, { exists: false, size: 0 }), false)
  assert.equal(matchesCopy({ size: 0 }, { exists: true, size: 0 }), false, 'an unknown size never counts')
  assert.equal(matchesCopy({ size: 5 }, null), false)
  assert.deepEqual([sizeWords(0), sizeWords(900), sizeWords(5 * 1024 * 1024), sizeWords(1.5 * 1024 ** 3)], ['0 KB', '1 KB', '5 MB', '1.5 GB'])
})

test('the media function checks the caller first, keeps R2’s keys to itself, and lets the app carry on before R2 is set up', () => {
  const fn = src('supabase/functions/media/index.ts')
  const firstLook = fn.indexOf('await look('), familyCheck = fn.indexOf("if (family !== true) return reply(403")
  assert.ok(familyCheck > 0 && familyCheck < firstLook, 'family is checked before R2 is touched')
  assert.match(fn, /if \(!READY\) return reply\(200, \{ notSetUp: true \}\)/)
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) assert.match(fn, new RegExp(`Deno\\.env\\.get\\('${k}'\\)`))
  assert.match(fn, /if \(!o\.upsert \|\| !AREAS\[o\.area\]\.overwrite\)/, 'not written over unless allowed and asked')
  assert.match(fn, /'x-amz-meta-owner'/, 'a drawing remembers who added it')
  assert.match(fn, /there\.owner !== mine/)
  assert.match(fn, /const owner = who\.parent && o\.owner \? o\.owner : mine/, 'only a parent can say who added a drawing')
  assert.match(fn, /MEDIA_FALLBACK/); assert.match(fn, /db\.storage\.from\(o\.area\)\.createSignedUrl/, 'the fallback is read as the caller, so Supabase’s rules decide')
})

test('the app never holds R2’s keys, and every screen reaches pictures through media.js (bar the move)', () => {
  const tracked = execSync('git ls-files src', { encoding: 'utf8' }).split('\n').filter((f) => /\.(js|jsx)$/.test(f))
  for (const f of tracked) {
    const s = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    assert.doesNotMatch(s, /R2_SECRET|R2_ACCESS_KEY|r2\.cloudflarestorage\.com/, `${f} mustn’t know R2’s keys or address`)
    if (f !== 'src/lib/media.js' && f !== 'src/consoles/MediaMove.jsx') assert.doesNotMatch(s, /supabase\.storage/, `${f}: pictures go through media.js`)
  }
  const media = src('src/lib/media.js')
  assert.match(media, /status === 404\) \{ mode = 'supabase'/, 'before the function is deployed, the old way')
  assert.match(media, /data\.notSetUp\) \{ mode = 'supabase'/, 'before R2 is set up, the old way')
  assert.match(media, /if \(mode === null && !seenR2\(\) && \(!status \|\| status === 401 \|\| status >= 500\)\) \{ mode = 'supabase'/, 'a function not reachable before it ever was here is the old way too')
  const move = src('src/consoles/MediaMove.jsx')
  assert.match(move, /const s = await survey\(area\) \/\/ looked at again, right before/, 'freeing space looks again first')
  assert.match(move, /<Confirm title="Free the space in Supabase\?"/)
})

test('the one-file copy for a dashboard deploy carries the shared rules inside it', async () => {
  const { oneFile } = await import('../scripts/one-file.mjs')
  const one = oneFile('media')
  assert.doesNotMatch(one, /from '\.\.\/_shared/, 'nothing left to import from the repository')
  assert.match(one, /^\/\/ @ts-nocheck/)
  assert.match(one, /const __shared_media = \(\(\) => \{/)
  assert.match(one, /const \{ AREAS, MAX_OPS, decide, checkOp, r2Key, r2Link, linkSeconds, validMember \} = __shared_media/)
  assert.match(one, /^const AREAS = \{/m)
  assert.doesNotMatch(one, /^export /m, 'the shared exports become plain names in their own scope')
  assert.match(oneFile('claude'), /\{ [^}]*clean: cleanText[^}]*\} = __shared_around/, 'a renamed import keeps its new name')
  assert.throws(() => oneFile('../x'), /Usage/)
})

test('a moved drawing keeps who added it: from its row, or the batch waiting', () => {
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222'
  const owners = drawingOwners(
    [{ id: 'd1', path: 'd1.jpg', thumb_path: 'd1.thumb.jpg', original: true, added_by: a }, { id: 'd2', path: 'd2.x7.jpg', thumb_path: 'd2.x7.thumb.jpg', original: false, added_by: b }, { id: 'd3', path: 'd3.jpg', added_by: null }],
    [{ id: 'q9', added_by: b }])
  assert.deepEqual(Object.fromEntries(owners), { 'd1.jpg': a, 'd1.thumb.jpg': a, 'd1.original.jpg': a, 'd2.x7.jpg': b, 'd2.x7.thumb.jpg': b, 'inbox/q9/kept.jpg': b, 'inbox/q9/view.jpg': b, 'inbox/q9/thumb.jpg': b })
  assert.equal(drawingOwners(null, undefined).size, 0)
  assert.ok(validMember(a)); for (const bad of ['u1', '', null, a + 'x', 7]) assert.ok(!validMember(bad), String(bad))
  assert.match(checkOp({ op: 'put', area: 'drawings', path: 'a.jpg', type: 'image/jpeg', size: 10, owner: 'someone' }), /family/)
  assert.equal(checkOp({ op: 'put', area: 'drawings', path: 'a.jpg', type: 'image/jpeg', size: 10, owner: a }), null)
  const move = src('src/consoles/MediaMove.jsx')
  assert.match(move, /upsert: true, owner: owners\.get\(f\.path\)/)
  assert.match(move, /\.range\(from, from \+ 999\)/, 'every drawing, past the 1000-row limit')
})
