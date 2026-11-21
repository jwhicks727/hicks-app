// ============================================
// stepTimers.js -- which waits in a step want a timer, and how long each is.
// ============================================
// A step's heading time ("**2. (25 min)**") is how long the whole step takes,
// chopping and all, so it is not a timer. A timer is a wait the step's own
// words name ("roast 20–25 minutes", "simmer 10 min, then rest 5 minutes"): one for
// each, so a step that waits twice has two. A step that names no time still
// gets one when it hands the food to the oven, a pot or the fridge ("roast
// until it flakes"), for the step's own time. Chopping, whisking and stirring
// get none.

/** No timer for less than this: a cook watches a one-minute job. */
export const MIN_MINUTES = 2

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }
const NUM = '\\d+(?:\\.\\d+)?(?:\\s*[½¼¾⅓⅔])?|[½¼¾⅓⅔]'
const TO = '\\s*(?:–|—|-|to)\\s*'
const MORE = '(?:\\s+(?:more|additional|extra))?'
const HOURS = '(?:hours?|hrs?|h)\\b'
const MINS = '(?:minutes?|mins?)\\b'
// "1 hour 15 minutes", "1–1½ hours", "20–25 minutes", "a 10-minute rest", "5 more minutes", "half an hour"
const DURATION = new RegExp(
  `(${NUM})(?:${TO}(${NUM}))?${MORE}\\s*-?\\s*${HOURS}(?:,?\\s*(?:and\\s+)?(\\d+)\\s*-?\\s*${MINS})?` +
  `|(${NUM})(?:${TO}(${NUM}))?${MORE}\\s*-?\\s*${MINS}` +
  '|\\b(half an hour|an hour)\\b',
  'gi',
)

const num = (s) => {
  if (s == null) return null
  const t = String(s).replace(/\s+/g, '')
  const frac = t.match(/[½¼¾⅓⅔]$/)
  const whole = frac ? t.slice(0, -1) : t
  return (whole ? Number(whole) : 0) + (frac ? FRACTIONS[frac[0]] : 0)
}

// What a wait is called on its timer, from the word that asks for it. The
// first group are the walk-away ones: the oven, a pot, the fridge or the
// counter has the food, so a step that names no time still wants a timer.
const WALK_AWAY = [
  [/\bbak(?:e|es|ed|ing)\b/, 'Bake'],
  [/\broast(?:s|ed|ing)?\b/, 'Roast'],
  [/\bbroil(?:s|ed|ing)?\b/, 'Broil'],
  [/\bair[- ]?fr(?:y|ies|ied|ying|yer)\b/, 'Air fry'],
  [/\bsimmer(?:s|ed|ing)?\b/, 'Simmer'],
  [/\bboil(?:s|ed|ing)?\b/, 'Boil'],
  [/\bbrais(?:e|es|ed|ing)\b/, 'Braise'],
  [/\bsteam(?:s|ed|ing)?\b/, 'Steam'],
  [/\bpoach(?:es|ed|ing)?\b/, 'Poach'],
  [/\bslow[- ]cook\w*/, 'Slow cook'],
  [/\b(?:high|low) pressure\b|\bpressure[- ]cook\w*|\binstant pot\b/, 'Pressure cook'],
  [/\b(?:natural(?:ly)?|quick) release\b|\breleas(?:e|es|ed|ing)\b/, 'Release'],
  [/\bmarinat(?:e|es|ed|ing)\b/, 'Marinate'],
  [/\bchill(?:s|ed|ing)?\b|\brefrigerat\w*/, 'Chill'],
  [/\bfreez(?:e|es|ing)\b/, 'Freeze'],
  [/\b(?:rise|rises|rising|proof|proofs|proofed|proofing)\b/, 'Rise'],
  [/\bsoak(?:s|ed|ing)?\b/, 'Soak'],
  [/\bsteep(?:s|ed|ing)?\b/, 'Steep'],
  [/\bcool(?:s|ed|ing)?\b/, 'Cool'],
  [/\brest(?:s|ed|ing)?\b(?!\s+of\b)/, 'Rest'],
  [/\b(?:sit|sits|sitting|stand|stands|standing)\b(?!\s+mixer)/, 'Rest'],
]
// These name a timed wait only when the words give its time.
const WATCHED = [
  [/\bsear(?:s|ed|ing)?\b/, 'Sear'],
  [/\bsaut[ée](?:s|ed|ing)?\b/, 'Sauté'],
  [/\b(?:fry|fries|fried|frying)\b/, 'Fry'],
  [/\btoast(?:s|ed|ing)?\b/, 'Toast'],
  [/\bgrill(?:s|ed|ing)?\b/, 'Grill'],
  [/\bchar(?:s|red|ring)?\b/, 'Char'],
  [/\breduc(?:e|es|ed|ing)\b/, 'Reduce'],
  [/\bcarameli[sz](?:e|es|ed|ing)\b/, 'Caramelize'],
  [/\bblanch(?:es|ed|ing)?\b/, 'Blanch'],
  [/\bmicrowav(?:e|es|ed|ing)\b/, 'Microwave'],
  [/\bknead(?:s|ed|ing)?\b/, 'Knead'],
  [/\b(?:whisk|whisks|whisked|whisking|beat|beats|beating)\b/, 'Whisk'],
  [/\bcook(?:s|ed|ing)?\b/, 'Cook'],
]
const WORDS = [...WALK_AWAY, ...WATCHED]

/** The last word in `text` that names a wait, as its timer's label. */
function lastAction(text) {
  const lower = text.toLowerCase()
  let best = null
  for (const [re, label] of WORDS) {
    const g = new RegExp(re.source, 'g')
    for (const m of lower.matchAll(g)) if (!best || m.index > best.at) best = { at: m.index, label }
  }
  return best ? best.label : null
}

// A time that isn't a wait to time: how long something keeps, a limit, an
// interval, how far ahead it can be made, or a rate.
const NOT_BEFORE = /\b(?:up to|no more than|at most|within|every|last|final|remaining|keeps?(?: for)?|lasts?(?: for)?|good for)\s+(?:the\s+)?(?:about\s+|another\s+)?$/i
const NOT_AFTER = /^\s*(?:ahead|in advance|(?:per|a|each) (?:pound|lb|inch)|of (?:prep|hands-on))\b/i
const PER_SIDE = /^\s*(?:per|a|on each|each) side\b/i
// "after 10 minutes, add the salmon": the timer is for what comes next.
const AFTER = /\b(?:after|in)\s+(?:about\s+|another\s+)?$/i

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${Math.round(m % 60)} min` : ''}` : `${Math.round(m)} min`)
const QUARTERS = { 0: '', 15: '¼', 30: '½', 45: '¾' }
const hours = (m) => `${Math.floor(m / 60) || ''}${QUARTERS[m % 60]}` // 90 -> "1½"

/** How a timer's length reads: "20–25 min", "1 hr 15 min", "1–1½ hr". */
export function timerTime({ minutes, upTo }) {
  if (!(upTo > minutes)) return fmt(minutes)
  if (upTo < 60) return `${Math.round(minutes)}–${Math.round(upTo)} min`
  if (minutes >= 60 && [minutes, upTo].every((m) => m % 15 === 0)) return `${hours(minutes)}–${hours(upTo)} hr`
  return `${fmt(minutes)}–${fmt(upTo)}`
}

/**
 * The timers a step wants, in the order its words give them:
 * [{ i, label, minutes, upTo?, perSide?, fromStep? }]. A range runs to its
 * low end, so the cook checks early, and keeps its high end as `upTo`.
 */
export function stepTimers(step) {
  const text = String(step?.text || '').replace(/\*\*|__|[*_]/g, '')
  const out = []
  let named = false // the words name a wait, even one too short for a timer
  let clauseFrom = 0 // where the words that can name the next wait begin
  const found = [...text.matchAll(DURATION)]
  for (let k = 0; k < found.length; k++) {
    const m = found[k]
    const at = m.index, end = at + m[0].length
    const before = text.slice(Math.max(0, at - 40), at)
    const after = text.slice(end, end + 30)
    // the second half of "30 minutes to 2 hours" or "30 minutes or 2 hours"
    const prev = found[k - 1]
    const joined = prev && /^\s*(?:to|or|–|-)\s*$/i.test(text.slice(prev.index + prev[0].length, at))
    let minutes, upTo
    if (m[1] != null) {
      minutes = num(m[1]) * 60 + (m[3] ? Number(m[3]) : 0)
      upTo = m[2] != null ? num(m[2]) * 60 : null
    } else if (m[4] != null) {
      minutes = num(m[4])
      upTo = m[5] != null ? num(m[5]) : null
    } else {
      minutes = /half/i.test(m[6]) ? 30 : 60
    }
    const sentenceStart = Math.max(text.lastIndexOf('.', at - 1), text.lastIndexOf(';', at - 1), text.lastIndexOf(':', at - 1)) + 1
    const from = Math.max(clauseFrom, sentenceStart)
    clauseFrom = end
    if (joined || NOT_BEFORE.test(before) || NOT_AFTER.test(after)) continue
    named = true
    if (!(minutes >= MIN_MINUTES)) continue
    let label = null
    if (AFTER.test(before)) {
      // the words after it: "after 10 minutes, add the salmon" -> "Add the salmon"
      const next = text.slice(end).replace(/^[\s,]+(?:then\s+)?/i, '').match(/^[^.,;:()]+/)
      const words = next ? next[0].trim().split(/\s+/).slice(0, 3).join(' ').replace(/\s+(?:to|the|a|an|in|on|into|with|and|of)$/i, '') : ''
      label = words ? capital(words.toLowerCase()) : null
    }
    label = label || lastAction(text.slice(from, at)) || lastAction(text.slice(sentenceStart, at)) || lastAction(text.slice(end, end + 60).split(/[.;]/)[0]) || 'Timer'
    const t = { i: out.length, label, minutes: Math.round(minutes * 10) / 10 }
    if (upTo && upTo > minutes) t.upTo = Math.round(upTo * 10) / 10
    if (PER_SIDE.test(after)) t.perSide = true
    out.push(t)
  }
  if (named) return out
  // No time in the words: a walk-away step still wants one, for the step's own time.
  if (step?.minutes == null || step.minutes < MIN_MINUTES) return out
  const lower = text.toLowerCase()
  let hit = null
  for (const [re, label] of WALK_AWAY) { const m = lower.match(re); if (m && (!hit || m.index < hit.at)) hit = { at: m.index, label } }
  if (!hit) return out
  return [{ i: 0, label: hit.label, minutes: step.minutes, fromStep: true }]
}

/** A timer's own name in the store: the recipe, the step and which of its waits. */
export const timerKey = (recipe, step, i) => `${recipe}:${step}:${i}`

/** How long after it ends a timer keeps ringing, then shows quietly, then is let go. */
export const RING_MS = 10 * 60000
export const KEEP_MS = 2 * 3600000

/**
 * Where each kept timer is at `now`: counting down, ringing (ended within
 * RING_MS), or ended a while ago and shown quietly. One that ended more than
 * KEEP_MS ago is let go.
 */
export function timerStates(list, now) {
  const running = [], ringing = [], quiet = []
  for (const t of list || []) {
    if (!t || !Number.isFinite(t.ends)) continue
    const left = Math.max(0, Math.ceil((t.ends - now) / 1000))
    const x = { ...t, left, over: Math.max(0, Math.floor((now - t.ends) / 1000)) }
    if (t.ends > now) running.push(x)
    else if (now - t.ends <= RING_MS) ringing.push(x)
    else if (now - t.ends <= KEEP_MS) quiet.push(x)
  }
  running.sort((a, b) => a.ends - b.ends)
  return { running, ringing, quiet }
}

/** "4:05", or "1:02:05" past the hour. */
export function clock(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
