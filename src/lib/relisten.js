// ============================================
// relisten.js -- this day in jam-band history, from Relisten
// ============================================
// Relisten (relisten.net) streams the Internet Archive's taped shows. Its
// "today" list is every recorded show on this month and day across the
// years; the family's bands come first. Read by the browser, nothing sent
// but the date. The answer's shape is unverified until it's seen live, so
// the parsing is forgiving and the card falls back to Relisten's own page.

export const TODAY_PAGE = 'https://relisten.net/today'
export const todayUrl = (month, day) => `https://api.relisten.net/api/v2/shows/today?month=${month}&day=${day}`
const OURS = /grateful dead|jerry garcia|phish|string cheese|widespread panic|dead & company|dead and company|goose|billy strings|umphrey|moe\./i

/** The shows, ours first, newest last within each band: [{ artist, date, year, venue, place, url }]. */
export function shapeToday(json) {
  const list = Array.isArray(json) ? json : (json && (json.shows || json.data)) || []
  const shows = list.map((s) => {
    const artist = (s.artist && (s.artist.name || s.artist.slug)) || s.artist_name || ''
    const slug = (s.artist && s.artist.slug) || ''
    const date = String(s.display_date || s.date || '').slice(0, 10)
    const venue = s.venue ? s.venue.name || '' : s.venue_name || ''
    const place = s.venue ? s.venue.location || '' : ''
    return { artist, date, year: date.slice(0, 4), venue, place, ours: OURS.test(artist), url: slug && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `https://relisten.net/${slug}/${date.replace(/-/g, '/')}` : TODAY_PAGE }
  }).filter((s) => s.artist && /^\d{4}-\d{2}-\d{2}$/.test(s.date))
  return shows.sort((a, b) => (a.ours !== b.ours ? (a.ours ? -1 : 1) : a.artist !== b.artist ? (/grateful dead/i.test(a.artist) ? -1 : /grateful dead/i.test(b.artist) ? 1 : a.artist.localeCompare(b.artist)) : a.date.localeCompare(b.date)))
}
