// ============================================
// text.js -- the week's ideas, as a text message to Laurie or Anna, and the reply back
// ============================================
// Jason taps once and his own Messages app opens with the numbered list, so
// Laurie (or Anna, on her watch) can answer "1, 3, 8". The message is made on the phone and sent by
// the phone's own messaging; nothing goes through this app's servers. Pure.

const MAX_LINE = 90

const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
const pretty = (week) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(week || '')
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : ''
}

/** The numbered list as a message: "1. Title — its line", with how to answer. */
export function listText(ideas, week) {
  const head = `Dinner ideas for the week of ${pretty(week)}. Which ones sound good? Reply with the numbers, like “1, 3, 8”:`.replace('week of . ', 'week. ')
  const lines = ideas.map((idea, i) => {
    const tag = idea.meal && idea.meal !== 'dinner' ? ` (${idea.meal})` : ''
    const line = idea.line ? ` — ${clip(idea.line, MAX_LINE)}` : ''
    return `${i + 1}. ${clip(idea.title, 80)}${tag}${line}`
  })
  return `${head}\n\n${lines.join('\n')}`
}

/** The link that opens a new message: to `number` (E.164) if there is one, else to whoever is chosen. Works on iPhone and Android. */
export const smsLink = (number, body) => `sms:${number || ''}?&body=${encodeURIComponent(body)}`

/** A phone number as typed, as E.164 (+19095551234), or null. A bare 10-digit number is taken as American. */
export function normalizePhone(text) {
  const raw = String(text || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 && digits[0] !== '0' ? '+' + digits : null
  if (digits.length === 10 && digits[0] !== '0' && digits[0] !== '1') return '+1' + digits
  if (digits.length === 11 && digits[0] === '1') return '+' + digits
  return null
}

/** Which ideas a reply picks, as zero-based positions: "1, 3, 8", "#2 and 5", "1 3". Numbers outside the list are ignored. */
export function picksFromReply(reply, count) {
  const seen = new Set()
  for (const m of String(reply || '').match(/\d+/g) || []) {
    const n = Number(m)
    if (n >= 1 && n <= count) seen.add(n - 1)
  }
  return [...seen].sort((a, b) => a - b)
}
