// ============================================
// outsideErrors.js -- why the stations or the birds aren't showing, in words
// ============================================
// Their Edge Functions (supabase/functions/stations, birds) fail in four
// different ways that used to read alike, so each says what to do:
// - a function that isn't deployed answers 404 with no CORS headers, so the
//   browser never sees a status at all: that reads as "not set up yet";
// - one deployed without its key answers 503: also "not set up yet";
// - one the service refused (a wrong key) says so in its own words;
// - anything else, or no connection, is "couldn't be reached" or "offline".

/** What went wrong asking a function, as { error, say? }, or null if nothing did. `error` is supabase-js's; `data` its answer. */
export function outsideProblem({ error, data, online = true }) {
  if (error) {
    if (!online) return { error: 'offline' }
    const status = error.context && error.context.status
    return { error: status == null || status === 404 || status === 503 ? 'setup' : 'unreachable' }
  }
  if (data && data.error && !data.at) return { error: 'said', say: String(data.error).slice(0, 160) }
  return null
}

const NAME = { stations: 'Each school’s own station', birds: 'Birds around us', 'birds-more': 'Birds around us' }
const NEEDS = { stations: 'its function deployed and the Synoptic token set', birds: 'its function deployed and the eBird key set' }

/** The sentence for a problem from outsideProblem(), for the card that shows `feature` ('stations' or 'birds'). */
export function outsideWords(feature, v) {
  if (!v || !v.error) return ''
  if (v.error === 'said') return v.say
  if (v.error === 'offline') return `${NAME[feature]} will be here when you’re back online.`
  if (v.error === 'unreachable') return `${NAME[feature]} couldn’t be reached just now.`
  return `${NAME[feature]} isn’t set up yet: it needs ${NEEDS[feature]} (docs/MORNING.md, step 10).`
}
