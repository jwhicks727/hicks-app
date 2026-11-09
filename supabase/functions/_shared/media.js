// ============================================
// media.js -- where the family's pictures live: a private Cloudflare R2 bucket, through short-lived signed links
// ============================================
// Plain JavaScript so tests/media.test.mjs runs it in Node. The `media` function
// (supabase/functions/media/index.ts) uses it to decide who may do what with a
// picture and to sign the links; the app never holds R2's keys (docs/SECRETS.md).
// R2 doesn't know who is signed in, so the rules Supabase's buckets used to keep
// (their storage policies, supabase/migrations) are kept here, one area to each
// old bucket, and every picture's key in R2 is "<area>/<path>". Nothing in R2 is
// public: a picture is reached only through a link this signs, for a family member.

/**
 * Each area's rules, as its Supabase bucket had them. `read`/`add`/`remove`: who may ('family', 'parent', or
 * 'owner': a parent, or whoever uploaded it). `overwrite`: whether a file already there may be written over.
 */
export const AREAS = {
  paintings: { read: 'family', add: 'parent', remove: 'parent', overwrite: true, types: ['image/jpeg', 'image/png'], maxBytes: 20 * 1024 * 1024 },
  drawings: { read: 'family', add: 'family', remove: 'owner', overwrite: false, types: ['image/jpeg'], maxBytes: 8 * 1024 * 1024 },
  trips: { read: 'family', add: 'family', remove: 'family', overwrite: false, types: ['image/jpeg'], maxBytes: 6 * 1024 * 1024 },
  garden: { read: 'family', add: 'family', remove: 'family', overwrite: false, types: ['image/jpeg'], maxBytes: 6 * 1024 * 1024 },
  academy: { read: 'family', add: 'parent', remove: 'parent', overwrite: false, types: ['image/png', 'image/webp'], maxBytes: 2 * 1024 * 1024 },
}
export const OPS = ['get', 'head', 'put', 'delete']
export const MAX_OPS = 200 // a gallery's worth of links in one ask
export const MAX_EXPIRES = 7 * 86400 // R2's longest signed link
export const DEFAULT_EXPIRES = 3600

/** A path the app makes: parts of letters, digits, dots, dashes and underscores, joined by slashes, never "..". */
export function validPath(path) {
  return typeof path === 'string' && path.length >= 1 && path.length <= 300 && !path.includes('..') &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/.test(path)
}

/** Where a picture is in the R2 bucket. */
export const r2Key = (area, path) => `${area}/${path}`

/**
 * Whether this person may do this: 'yes', 'no', or 'owner' (allowed if they uploaded the file: the function looks).
 * `who` is { family, parent }.
 */
export function decide(op, area, who) {
  const rules = AREAS[area]
  if (!rules || !OPS.includes(op) || !who || !who.family) return 'no'
  const rule = op === 'get' || op === 'head' ? rules.read : op === 'put' ? rules.add : rules.remove
  if (rule === 'family') return 'yes'
  if (rule === 'parent') return who.parent ? 'yes' : 'no'
  if (rule === 'owner') return who.parent ? 'yes' : 'owner'
  return 'no'
}

/** A family member's id (a uuid), as `x-amz-meta-owner` keeps it on a drawing. */
export const validMember = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

/** What's wrong with one asked-for operation, in words, or null. */
export function checkOp(o) {
  if (!o || typeof o !== 'object') return 'Each one needs an op, an area and a path'
  if (!OPS.includes(o.op)) return `Unknown op “${String(o.op).slice(0, 20)}”`
  const rules = AREAS[o.area]
  if (!rules) return `Unknown area “${String(o.area).slice(0, 20)}”`
  if (!validPath(o.path)) return 'That isn’t a path the app makes'
  if (o.op === 'put') {
    if (!rules.types.includes(o.type)) return `A ${o.area} picture is ${rules.types.join(' or ')}`
    if (!Number.isFinite(Number(o.size)) || Number(o.size) <= 0) return 'The picture’s size is missing'
    if (Number(o.size) > rules.maxBytes) return `That picture is over ${Math.round(rules.maxBytes / 1048576)} MB`
    if (o.owner != null && !validMember(o.owner)) return 'That isn’t one of the family'
  }
  return null
}

/** How long a link lasts: what was asked, within an hour and R2's seven days. */
export const linkSeconds = (asked) => Math.max(60, Math.min(MAX_EXPIRES, Math.round(Number(asked) || DEFAULT_EXPIRES)))

// ---- Signing a link (AWS Signature Version 4, which R2 speaks), with the Web Crypto both Deno and Node have ----
const enc = new TextEncoder()
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const subtle = () => globalThis.crypto.subtle
async function hmac(key, data) {
  const k = await subtle().importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await subtle().sign('HMAC', k, enc.encode(data)))
}
/** RFC 3986 encoding, as Signature Version 4 wants it: only A-Z a-z 0-9 - _ . ~ left as they are. */
export const uriEncode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

/**
 * A signed link: anyone holding it may do `method` to `path` on `host` until it runs out, sending exactly the
 * `headers` signed into it (a picture's type, say), and nothing else. `date` is when it's signed.
 */
export async function presign({ method, host, path, region, service = 's3', accessKeyId, secretAccessKey, expires, date = new Date(), headers = {} }) {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const day = amzDate.slice(0, 8)
  const scope = `${day}/${region}/${service}/aws4_request`
  const hdrs = { host, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])) }
  const names = Object.keys(hdrs).sort()
  const signedHeaders = names.join(';')
  const query = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${accessKeyId}/${scope}`, 'X-Amz-Date': amzDate, 'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': signedHeaders }
  const canonicalQuery = Object.keys(query).sort().map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`).join('&')
  const canonicalHeaders = names.map((k) => `${k}:${hdrs[k]}\n`).join('')
  const canonicalUri = path.split('/').map(uriEncode).join('/')
  const request = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, hex(await subtle().digest('SHA-256', enc.encode(request)))].join('\n')
  let key = await hmac('AWS4' + secretAccessKey, day)
  key = await hmac(key, region); key = await hmac(key, service); key = await hmac(key, 'aws4_request')
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${hex(await hmac(key, toSign))}`
}

/** A signed link to a picture in the family's R2 bucket (`cfg`: { accountId, bucket, accessKeyId, secretAccessKey }). */
export function r2Link(cfg, method, key, expires, headers = {}, date = new Date()) {
  return presign({ method, host: `${cfg.accountId}.r2.cloudflarestorage.com`, path: `/${cfg.bucket}/${key}`, region: 'auto', accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, expires, date, headers })
}
