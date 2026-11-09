// ============================================
// media -- the family's pictures, in a private Cloudflare R2 bucket (docs/R2-SETUP.md)
// ============================================
// The app asks here for short-lived signed links to see, add or take away a
// picture; this checks the caller is family (or a parent, where the area says so:
// _shared/media.js keeps the rules the Supabase buckets used to) and signs them
// with R2's keys, which live only in this function's secrets (docs/SECRETS.md).
// Nothing in R2 is public. Deployed with --no-verify-jwt because it checks the
// caller itself, like the claude function.
//
// Two things make the move from Supabase's storage safe in any order:
//  - Until R2's secrets are set, it answers { notSetUp: true } and the app keeps
//    using Supabase's storage exactly as before (src/lib/media.js).
//  - While MEDIA_FALLBACK isn't "off", a picture not yet copied into R2 is served
//    from Supabase's bucket (as the caller, so its own rules decide), and taking a
//    picture away takes any copy left there too. Admin › "Where pictures are kept"
//    copies everything over; turn the fallback off once it's done.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { AREAS, MAX_OPS, decide, checkOp, r2Key, r2Link, linkSeconds, validMember } from '../_shared/media.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const cfg = {
  accountId: Deno.env.get('R2_ACCOUNT_ID') ?? '',
  bucket: Deno.env.get('R2_BUCKET') ?? 'hicks-media',
  accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
  secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
}
const READY = Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey)
const FALLBACK = (Deno.env.get('MEDIA_FALLBACK') ?? 'on').toLowerCase() !== 'off'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** What R2 has at a key: whether it's there, its size, and who added it (drawings keep their family member's id). */
async function look(key: string) {
  const res = await fetch(await r2Link(cfg, 'HEAD', key, 300), { method: 'HEAD' })
  if (res.status === 404) return { exists: false, size: 0, owner: null as string | null }
  if (!res.ok) throw new Error(`R2 answered ${res.status}`)
  return { exists: true, size: Number(res.headers.get('content-length') ?? 0), owner: res.headers.get('x-amz-meta-owner') }
}

/** Runs `work` over the list a few at a time, keeping the order. */
async function pool<T, R>(list: T[], size: number, work: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(list.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(size, list.length) }, async () => {
    while (next < list.length) { const i = next++; out[i] = await work(list[i]) }
  }))
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  // Not set up yet: the app goes on with Supabase's storage
  if (!READY) return reply(200, { notSetUp: true })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const [{ data: family }, { data: parent }, { data: member }] = await Promise.all([db.rpc('is_family'), db.rpc('is_parent'), db.rpc('my_member_id')])
  if (family !== true) return reply(403, { error: 'For the family only' })
  const mine = validMember(member) ? member : null // the family_members id, as annas_drawings.added_by keeps it
  const who = { family: true, parent: parent === true }

  // deno-lint-ignore no-explicit-any
  let body: any = {}
  try { body = await req.json() } catch { return reply(400, { error: 'Nothing asked' }) }
  const ops = Array.isArray(body.ops) ? body.ops : []
  if (!ops.length || ops.length > MAX_OPS) return reply(400, { error: `One to ${MAX_OPS} at a time, please` })

  // deno-lint-ignore no-explicit-any
  const results = await pool(ops, 16, async (o: any) => {
    const why = checkOp(o)
    if (why) return { error: why, status: 400 }
    const verdict = decide(o.op, o.area, who)
    if (verdict === 'no') return { error: o.op === 'get' || o.op === 'head' ? 'For the family only' : 'Jason or Laurie can do this one', status: 403 }
    const key = r2Key(o.area, o.path)
    try {
      if (o.op === 'get') {
        const secs = linkSeconds(o.expires)
        if (FALLBACK) {
          const there = await look(key)
          if (!there.exists) {
            // Not moved over yet: Supabase's copy, as this person
            const { data } = await db.storage.from(o.area).createSignedUrl(o.path, secs)
            return data?.signedUrl ? { url: data.signedUrl, from: 'supabase' } : { error: 'Object not found', status: 404 }
          }
        }
        return { url: await r2Link(cfg, 'GET', key, secs) }
      }
      if (o.op === 'head') {
        const there = await look(key)
        return { exists: there.exists, size: there.size }
      }
      if (o.op === 'put') {
        // Not written over unless the area allows it and this upload asked to (as Supabase's buckets kept it)
        if (!o.upsert || !AREAS[o.area].overwrite) {
          if ((await look(key)).exists) return { error: 'The resource already exists', status: 409 }
        }
        const headers: Record<string, string> = { 'content-type': o.type }
        if (AREAS[o.area].remove === 'owner') {
          // So only they, or a parent, can take it away. A parent moving pictures over keeps who really added each.
          const owner = who.parent && o.owner ? o.owner : mine
          if (owner) headers['x-amz-meta-owner'] = owner
        }
        return { url: await r2Link(cfg, 'PUT', key, 900, headers), headers }
      }
      // delete
      if (verdict === 'owner') {
        const there = await look(key)
        if (there.exists && there.owner !== mine) return { error: 'Only whoever added it, or Jason or Laurie, can take it away', status: 403 }
      }
      const res = await fetch(await r2Link(cfg, 'DELETE', key, 300), { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`R2 answered ${res.status}`)
      if (FALLBACK) await db.storage.from(o.area).remove([o.path]).catch(() => null)
      return { ok: true }
    } catch {
      return { error: 'The picture store couldn’t be reached just now', status: 502 }
    }
  })
  return reply(200, { results })
})
