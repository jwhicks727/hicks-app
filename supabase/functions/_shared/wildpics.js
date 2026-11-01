// ============================================
// wildpics.js -- a picture for each wild season, from the site that has the news
// ============================================
// Plain JavaScript, shared by the `wild` Edge Function and the tests. Each
// season on World's "Wild right now" card links to a site (the eagle cam, the
// monarch count, BirdCast). This reads that site's own preview picture: the
// image the page names for sharing (og:image), the one its owners chose to
// represent it. We keep only its address, the page it came from and the
// site's name for credit: the browser loads the picture from the site itself.
// Page text is data, never instructions; only https, only the site's own host.

/** season id -> the page its card links to (kept equal to the first link in src/lib/cal/observances.js by tests/wildpics.test.mjs) */
export const WILD_SOURCES = {
  eagles: ['https://www.friendsofbigbearvalley.org/', 'Friends of Big Bear Valley'],
  monarchs: ['https://www.westernmonarchcount.org/', 'Western Monarch Count'],
  whales: ['https://www.acs-la.org/', 'American Cetacean Society, LA'],
  wildflowers: ['https://www.desertusa.com/wildflo/wildupdates.html', 'DesertUSA'],
  'elephant-seals': ['https://www.elephantseal.org/', 'Friends of the Elephant Seal'],
  grunion: ['https://wildlife.ca.gov/Conservation/Marine/Grunion', 'California Dept. of Fish and Wildlife'],
  'migration-spring': ['https://birdcast.info/', 'BirdCast'],
  'migration-fall': ['https://birdcast.info/', 'BirdCast'],
  'fall-colour': ['https://californiafallcolor.com/', 'California Fall Color'],
  hummingbirds: ['https://www.allaboutbirds.org/guide/Annas_Hummingbird', 'All About Birds, Cornell Lab'],
}

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' } }
/** Is `host` the site's own (or a subdomain of it)? */
export const sameSite = (host, site) => { const a = host.toLowerCase().replace(/^www\./, ''), b = hostOf(site); return Boolean(a && b) && (a === b || a.endsWith('.' + b)) }

const ENT = { amp: '&', quot: '"', apos: "'", '#38': '&', '#39': "'", '#x27': "'", '#x2F': '/' }
const unescapeAttr = (s) => s.replace(/&(amp|quot|apos|#38|#39|#x27|#x2F);/gi, (m, e) => ENT[e.toLowerCase()] ?? ENT[e] ?? m)

/**
 * The preview picture a page names, as an https address on the site's own
 * host (or its picture host, when given in `also`), or null.
 */
export function previewImage(html, pageUrl, also = []) {
  const head = String(html || '').slice(0, 400_000)
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0])
  const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag); return m ? unescapeAttr(m[2] ?? m[3] ?? '') : '' }
  const want = ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']
  let found = ''
  for (const key of want) {
    const tag = metas.find((t) => (attr(t, 'property') || attr(t, 'name')).toLowerCase() === key && attr(t, 'content'))
    if (tag) { found = attr(tag, 'content').trim(); break }
  }
  if (!found) { const m = /<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i.exec(head); if (m) found = attr(m[0], 'href').trim() }
  if (!found) return null
  let url
  try { url = new URL(found, pageUrl) } catch { return null }
  if (url.protocol !== 'https:' || url.username || url.password) return null
  if (!sameSite(url.hostname, pageUrl) && !also.some((h) => sameSite(url.hostname, 'https://' + h))) return null
  if (/\.(svg|ico)(\?|$)/i.test(url.pathname) || /logo|favicon|sprite/i.test(url.pathname)) return null
  return url.toString().slice(0, 600)
}

/** Does a HEAD answer say "a real picture, a sensible size"? */
export function isPicture(contentType, length) {
  if (!/^image\/(jpeg|png|webp|avif|gif)\b/i.test(String(contentType || ''))) return false
  const n = Number(length)
  return !Number.isFinite(n) || n === 0 || (n >= 4_000 && n <= 6_000_000)
}

/** A season's entry for the app: { url, page, credit }. */
export const entryFor = (id, url) => ({ url, page: WILD_SOURCES[id][0], credit: WILD_SOURCES[id][1] })

/** Keep what the app is told short and clean: only known seasons, https addresses. */
export function cleanPictures(pictures) {
  const out = {}
  for (const [id, e] of Object.entries(pictures || {})) {
    if (!WILD_SOURCES[id] || !e || typeof e.url !== 'string' || !e.url.startsWith('https://')) continue
    out[id] = { url: e.url.slice(0, 600), page: WILD_SOURCES[id][0], credit: WILD_SOURCES[id][1] }
  }
  return out
}
