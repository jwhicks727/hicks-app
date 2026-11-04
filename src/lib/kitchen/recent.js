// The recipes opened lately on this device, newest first: a convenience, kept only here.
const KEY = 'teamhicks.recent.recipes'
export function readRecent() { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((s) => typeof s === 'string').slice(0, 12) } catch { return [] } }
export function noteRecent(slug) { try { localStorage.setItem(KEY, JSON.stringify([slug, ...readRecent().filter((s) => s !== slug)].slice(0, 12))) } catch { /* not kept */ } }
