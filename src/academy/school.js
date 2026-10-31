// ============================================
// school.js -- goals, tasks, grades and cheers at Anna's academy
// ============================================
// Pure, so tests run it in Node. The academy is for celebrating her: a task
// done lights a star in the campus sky, a goal reached puts a trophy in the
// Hall of Fame, a good grade (or a better one) earns a medal or a ribbon,
// and anyone can cheer her for anything.

import { parts, diffDays, addDays } from '../lib/cal/dates.js'

// ---- Tasks ----

/** Stars in the sky: tasks done this month. */
export const starsThisMonth = (tasks, today) => tasks.filter((t) => t.done_on && t.done_on.slice(0, 7) === today.slice(0, 7)).length

/** Tasks as a day sees them: late, today, coming, and done today. */
export function taskDay(tasks, today) {
  const open = tasks.filter((t) => !t.done_on)
  const by = (a, b) => (a.due_on || '9999') < (b.due_on || '9999') ? -1 : (a.due_on || '9999') > (b.due_on || '9999') ? 1 : (a.created_at || '') < (b.created_at || '') ? -1 : 1
  return {
    late: open.filter((t) => t.due_on && t.due_on < today).sort(by),
    today: open.filter((t) => !t.due_on || t.due_on === today).sort(by),
    coming: open.filter((t) => t.due_on && t.due_on > today).sort(by),
    done: tasks.filter((t) => t.done_on === today),
  }
}

/** "Due Friday", "Due tomorrow", "Was due Tuesday". */
export function dueWords(due, today) {
  if (!due) return ''
  const n = diffDays(today, due)
  const day = new Date(Date.UTC(...parts(due).map((x, i) => (i === 1 ? x - 1 : x)))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' })
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n > 1 && n < 7) return `Due ${day}`
  if (n >= 7) return `Due ${new Date(Date.UTC(...parts(due).map((x, i) => (i === 1 ? x - 1 : x)))).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })}`
  if (n === -1) return 'Was due yesterday'
  return n > -7 ? `Was due ${day}` : `Was due ${-n} days ago`
}

// ---- Goals ----

/** How far along a goal is: { done, total, ratio, finished }. */
export function goalProgress(g) {
  const steps = Array.isArray(g.steps) ? g.steps : []
  const done = steps.filter((s) => s.done).length
  const finished = Boolean(g.done_on)
  return { done, total: steps.length, ratio: finished ? 1 : steps.length ? done / steps.length : 0, finished }
}

// ---- Grades ----

const LETTERS = { 'A+': 13, A: 12, 'A-': 11, 'B+': 10, B: 9, 'B-': 8, 'C+': 7, C: 6, 'C-': 5, 'D+': 4, D: 3, 'D-': 2, F: 0 }
/** A grade as a number to compare: its letter's rank, or a percent read as one. */
export function gradeRank(g) {
  const m = String(g.mark || '').trim().toUpperCase()
  if (m in LETTERS) return LETTERS[m]
  const pct = g.percent != null ? Number(g.percent) : /^\d{1,3}(\.\d+)?%?$/.test(m) ? parseFloat(m) : null
  if (pct == null || Number.isNaN(pct)) return null
  return pct >= 97 ? 13 : pct >= 93 ? 12 : pct >= 90 ? 11 : pct >= 87 ? 10 : pct >= 83 ? 9 : pct >= 80 ? 8 : pct >= 77 ? 7 : pct >= 73 ? 6 : pct >= 70 ? 5 : pct >= 60 ? 3 : 0
}
const An = (m) => (/^[AEF]/i.test(m) || /^(8|11|18)/.test(m) ? 'An' : 'A')

/**
 * Whether a grade is one to celebrate, against the last one in the same class:
 * { prize, title } for an A, or for going up; null otherwise. Never a word about a dip.
 */
export function gradeCheer(grade, earlier = []) {
  const r = gradeRank(grade)
  if (r == null) return null
  const prev = earlier.filter((g) => g.class_name === grade.class_name && g.id !== grade.id && (g.on_date || '') <= (grade.on_date || '')).sort((a, b) => ((a.on_date || '') < (b.on_date || '') ? 1 : -1))[0]
  const pr = prev ? gradeRank(prev) : null
  const mark = grade.mark || `${grade.percent}%`
  if (pr != null && r > pr && r >= 9) return { prize: r >= 11 ? '1st-place-medal' : 'rosette', title: `Up from ${prev.mark || `${prev.percent}%`} to ${mark} in ${grade.class_name}!` }
  if (r >= 12) return { prize: '1st-place-medal', title: `${An(mark)} ${mark} in ${grade.class_name}!` }
  if (r === 11) return { prize: 'sports-medal', title: `${An(mark)} ${mark} in ${grade.class_name}!` }
  if (pr != null && r > pr) return { prize: 'rosette', title: `Up from ${prev.mark || `${prev.percent}%`} to ${mark} in ${grade.class_name}` }
  return null
}

/** The latest grade in each class, by class name. */
export function latestByClass(grades) {
  const out = new Map()
  for (const g of [...grades].sort((a, b) => ((a.on_date || '') < (b.on_date || '') ? -1 : 1))) out.set(g.class_name, g)
  return [...out.values()].sort((a, b) => a.class_name.localeCompare(b.class_name))
}

// ---- The Hall of Fame ----

/** Everything earned, newest first: [{ key, prize, title, on }]. */
export function fame({ goals = [], grades = [], cheers = [] }) {
  const out = []
  for (const g of goals) if (g.done_on) out.push({ key: 'g' + g.id, prize: 'trophy', title: g.title, on: g.done_on, kind: 'goal' })
  for (const g of grades) { const c = gradeCheer(g, grades); if (c) out.push({ key: 'm' + g.id, prize: c.prize, title: c.title, on: g.on_date, kind: 'grade' }) }
  for (const c of cheers) out.push({ key: 'c' + c.id, prize: c.icon || 'glowing-star', title: c.title, on: c.on_date, kind: 'cheer', from: c.from_name })
  return out.sort((a, b) => ((a.on || '') < (b.on || '') ? 1 : -1))
}

/** The cheer in the spotlight: the newest from the last week, or null. */
export const spotlight = (cheers, today) => cheers.filter((c) => c.on_date && diffDays(c.on_date, today) <= 7 && c.on_date <= today).sort((a, b) => (a.on_date < b.on_date ? 1 : a.on_date > b.on_date ? -1 : (a.created_at || '') < (b.created_at || '') ? 1 : -1))[0] || null

export const GOAL_ICONS = ['rocket', 'books', 'basketball', 'artist-palette', 'musical-notes', 'guitar', 'microscope', 'cookie', 'seedling', 'running-shoe', 'globe-showing-americas', 'tent', 'folded-hands', 'graduation-cap', 'gem-stone', 'crown']
export const CHEER_ICONS = ['glowing-star', 'party-popper', 'trophy', 'crown', 'rainbow', 'sparkles', 'gem-stone', 'rosette', 'reminder-ribbon', 'tiger', 'cat', 'bouquet']

// ---- The cafeteria's board, a different lunch each weekday ----
const MENU = [['Pancake Sunday', 'pancakes'], ['Taco Monday', 'taco'], ['Noodle Tuesday', 'dumpling'], ['Waffle Wednesday', 'shortcake'], ['Pizza Thursday', 'pizza'], ['Sushi Friday', 'sushi'], ['Cupcake Saturday', 'cupcake']]
export const menuFor = (today) => MENU[new Date(Date.UTC(...parts(today).map((x, i) => (i === 1 ? x - 1 : x)))).getUTCDay()][0]

/** A week of dates ending today, for the little calendar of stars. */
export const lastDays = (today, n = 7) => Array.from({ length: n }, (_, k) => addDays(today, k - n + 1))
