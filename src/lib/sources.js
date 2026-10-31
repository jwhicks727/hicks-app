// ============================================
// sources.js -- the outside things the app reads, and when they go stale
// ============================================
// Pure: no React, no database, so tests can run it.

export const SOURCE_KINDS = [
  ['google_calendar', 'Google Calendar', 'Paste its “Secret address in iCal format” (Settings and sharing → Integrate calendar), or the public one for a shared calendar; read every night'],
  ['ical', 'iCal or webcal link', 'Outlook, iCloud and most school systems publish one; read every night'],
  ['pdf', 'PDF', 'Read into dates you approve'],
  ['word', 'Word document', 'Read into dates you approve'],
  ['google_doc', 'Google Doc', 'Read into dates you approve'],
  ['google_sheet', 'Google Sheet', 'Read into dates you approve'],
  ['drive_folder', 'Google Drive folder', 'Each file inside is read'],
  ['web_page', 'Web page', 'Read into dates you approve'],
  ['image', 'Photo or scan', 'A picture of a printed calendar, read into dates you approve'],
  ['email', 'Email', 'A message, or a monthly email looked for each month'],
  ['groupme', 'GroupMe', 'Schedule posts in a group, keeping only our own dates'],
  ['other', 'Something else', 'Kept, and read by hand'],
]

/** Guess a source's kind from the link pasted, so pasting is usually enough. */
export function guessKind(url) {
  const u = (url || '').trim().toLowerCase()
  if (!u) return null
  if (u.startsWith('webcal:') || /\.ics(\?|$)/.test(u) || u.includes('/ical/')) return 'ical'
  if (u.includes('calendar.google.com')) return 'google_calendar'
  if (u.includes('docs.google.com/document')) return 'google_doc'
  if (u.includes('docs.google.com/spreadsheets')) return 'google_sheet'
  if (u.includes('drive.google.com/drive/folders') || u.includes('drive.google.com/drive/u/')) return 'drive_folder'
  if (/\.pdf(\?|$)/.test(u)) return 'pdf'
  if (/\.docx?(\?|$)/.test(u)) return 'word'
  if (/\.(png|jpe?g|heic|webp)(\?|$)/.test(u)) return 'image'
  if (u.includes('groupme.com')) return 'groupme'
  if (u.startsWith('http')) return 'web_page'
  return null
}

function dayNumber(ds) {
  const [y, m, d] = ds.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 864e5
}

/**
 * Whether a source needs rolling over: 'stale' once the dates it covers have
 * run out, 'soon' within its reminder window, otherwise 'ok' (or 'open' when
 * it has no end, like a live calendar feed). Dates are calendar dates
 * ('YYYY-MM-DD'), compared as dates, never parsed as times.
 */
export function staleness(source, today) {
  if (!source.covers_until) return { state: 'open', days: null }
  const days = dayNumber(source.covers_until) - dayNumber(today)
  if (days < 0) return { state: 'stale', days }
  if (days <= (source.remind_days ?? 30)) return { state: 'soon', days }
  return { state: 'ok', days }
}
