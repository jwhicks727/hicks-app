// ============================================
// writeEach.js -- writing the picked recipes one request each
// ============================================
// The `claude` Edge Function answers only when it is finished, and the platform
// gives up on a request that takes longer than about 150 seconds. Several full
// recipes in one request can pass that, and the answer is then a gateway error
// with no words in it. One recipe per request stays well under it, a few run
// side by side, and one slow dish never loses the others.

/**
 * Write each idea with `ask(idea)` (-> { error } or { recipes: [{ body }] }),
 * `size` at a time. Returns { bodies, failed }: the Markdown files written, in
 * the order the ideas were picked, and the titles that didn't come back, with
 * the first reason given.
 */
export async function writeEach(ideas, ask, { size = 3 } = {}) {
  const results = new Array(ideas.length)
  let next = 0
  async function worker() {
    while (next < ideas.length) {
      const i = next++
      try { results[i] = await ask(ideas[i]) } catch { results[i] = { error: 'Claude couldn’t be reached just now' } }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, ideas.length)) }, worker))
  const bodies = [], failed = []
  let reason = ''
  results.forEach((res, i) => {
    const got = res && !res.error && Array.isArray(res.recipes) ? res.recipes.map((r) => r && r.body).filter(Boolean) : []
    if (got.length) bodies.push(...got)
    else { failed.push(ideas[i].title); if (!reason) reason = (res && res.error) || 'Claude sent nothing back' }
  })
  return { bodies, failed, reason }
}

/** The words for a shortfall: which ones are missing, and why. */
export function failedWords(failed, reason) {
  if (!failed.length) return ''
  const names = failed.map((t) => `“${t}”`).join(', ')
  return `${failed.length === 1 ? 'One recipe' : `${failed.length} recipes`} didn’t come back (${names}): ${reason}. Pick ${failed.length === 1 ? 'it' : 'them'} and write again.`
}
