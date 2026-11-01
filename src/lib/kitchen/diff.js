// ============================================
// diff.js -- what a proposed change does to a text, line by line
// ============================================
// Pure: tests/kitchen-diff.test.mjs. For the Kitchen chat's "change this"
// cards: the saved version beside the new one, so a change is read before
// it's saved.

/** Each line kept, added or taken out, in order: [{ t: 'same' | 'add' | 'del', line }]. */
export function lineDiff(before = '', after = '') {
  const a = String(before).replace(/\r\n?/g, '\n').split('\n'), b = String(after).replace(/\r\n?/g, '\n').split('\n')
  // Longest common run of lines, kept small enough for a phone (recipes are a few hundred lines at most)
  if (a.length * b.length > 4_000_000) return [...a.map((line) => ({ t: 'del', line })), ...b.map((line) => ({ t: 'add', line }))]
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: 'same', line: a[i] }); i++; j++ }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: 'del', line: a[i++] })
    else out.push({ t: 'add', line: b[j++] })
  }
  while (i < n) out.push({ t: 'del', line: a[i++] })
  while (j < m) out.push({ t: 'add', line: b[j++] })
  return out
}

/**
 * The changes with a line of what's around each, the long unchanged stretches
 * folded to { t: 'gap', count }. Blank lines don't count as changes.
 */
export function changesOnly(diff, around = 1) {
  const changed = diff.map((d) => d.t !== 'same' && d.line.trim() !== '')
  const keep = diff.map((_, i) => changed.slice(Math.max(0, i - around), i + around + 1).some(Boolean))
  const out = []
  diff.forEach((d, i) => {
    if (keep[i]) { if (d.t !== 'same' && !d.line.trim()) return; out.push(d); return }
    const last = out[out.length - 1]
    if (last && last.t === 'gap') last.count++
    else out.push({ t: 'gap', count: 1 })
  })
  return out
}

/** How much changed, in words: "3 lines added, 2 taken out". */
export function diffWords(diff) {
  const add = diff.filter((d) => d.t === 'add' && d.line.trim()).length, del = diff.filter((d) => d.t === 'del' && d.line.trim()).length
  if (!add && !del) return 'No changes'
  return [add && `${add} ${add === 1 ? 'line' : 'lines'} added`, del && `${del} taken out`].filter(Boolean).join(', ')
}
