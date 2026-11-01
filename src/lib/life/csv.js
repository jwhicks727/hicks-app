// ============================================
// csv.js -- a CSV file as rows of cells, the way spreadsheets and eBird write it
// ============================================
// Pure: tests/life-list.test.mjs. Quoted cells may hold commas, quotes ("") and
// line breaks; a byte-order mark and Windows line ends are fine.

/** Rows of cells from CSV text; blank lines are dropped. */
export function parseCsv(text) {
  const s = String(text || '').replace(/^﻿/, '')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else quoted = false } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}
