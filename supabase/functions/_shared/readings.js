// ============================================
// readings.js -- the day's Mass readings, read from USCCB's page for a date
// ============================================
// Plain JavaScript for the readings Edge Function (Deno) and the tests
// (Node). Unverified against the live page: written to its shape as known
// (a heading per reading, its citation, its text), tolerant of change, and
// returning nothing rather than guessing when the shape isn't found. The
// text is shown privately to the signed-in family and never stored.

const NAMES = /^(reading\s*(i{1,2}|[12])|first reading|second reading|responsorial psalm|psalm|alleluia|verse before the gospel|gospel|sequence|gospel acclamation|reading at the procession with palms|epistle)\b/i
const MMDDYY = (d) => `${d.slice(5, 7)}${d.slice(8, 10)}${d.slice(2, 4)}`

/** The page for a date, and for one of its Masses ("Vigil", "Night", "Dawn", "Day"). */
export function readingsPageUrl(date, variant = '') {
  if (!/^\d{4}-\d\d-\d\d$/.test(date)) return null
  const v = /^[A-Za-z0-9]{1,20}$/.test(variant || '') ? `-${variant}` : ''
  return `https://bible.usccb.org/bible/readings/${MMDDYY(date)}${v}.cfm`
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' }
export function textOf(html) {
  return String(html)
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m))
    .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The readings on a page: { title, lectionary, readings: [{ name, citation, text }], masses: [{ label, variant }] }
 * `readings` is empty when the page's shape isn't recognised.
 */
export function parseReadings(html, date) {
  const page = String(html).slice(0, 2_000_000)
  const title = textOf((page.match(/<div[^>]*class="[^"]*b-lectionary[^"]*"[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i) || page.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || page.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s*\|.*$/, '').slice(0, 200)
  const lect = (textOf(page).match(/Lectionary:\s*([0-9A-Za-z][0-9A-Za-z ,/-]{0,30})/) || [])[1] || null
  const readings = []
  const heads = [...page.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)]
  heads.forEach((h, i) => {
    const name = textOf(h[1]).slice(0, 80)
    if (!NAMES.test(name)) return
    const until = i + 1 < heads.length ? heads[i + 1].index : page.length
    const chunk = page.slice(h.index + h[0].length, until)
    const citation = textOf((chunk.match(/class="[^"]*address[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || chunk.match(/<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || '').slice(0, 120)
    const body = (chunk.match(/class="[^"]*content-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]
    const text = textOf(body || '').slice(0, 20000)
    if (text) readings.push({ name, citation, text })
  })
  const day = MMDDYY(date || '0000-00-00'), masses = [], seen = new Set()
  for (const [, href, label] of page.matchAll(/<a[^>]+href="[^"]*\/bible\/readings\/(\d{6}(?:-[A-Za-z0-9]{1,20})?)\.cfm"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const [d6, variant = ''] = href.split('-')
    if (d6 !== day || seen.has(variant)) continue
    seen.add(variant)
    masses.push({ label: textOf(label).slice(0, 60) || 'Mass', variant })
  }
  return { title, lectionary: lect ? lect.trim() : null, readings, masses: masses.length > 1 ? masses : [] }
}
