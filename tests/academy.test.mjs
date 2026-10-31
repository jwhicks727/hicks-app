// Anna's academy: its geometry, its rooms, and what it celebrates.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pt, mid, cellAt, byDepth, MOVES, wallMatrix } from '../src/academy/iso.js'
import { ROOM_KINDS, newRoom, freeSquare, campusSize, moveItem, moveRoom, ROOM_N } from '../src/academy/rooms.js'
import { ITEMS, ITEM } from '../src/academy/items.js'
import { starsThisMonth, taskDay, dueWords, goalProgress, gradeRank, gradeCheer, latestByClass, fame, spotlight, menuFor } from '../src/academy/school.js'

test('the grid: corners, middles, and the square under a point', () => {
  assert.deepEqual(pt(0, 0), { x: 0, y: 0 })
  assert.deepEqual(pt(1, 0), { x: 32, y: 16 })
  assert.deepEqual(pt(0, 1), { x: -32, y: 16 })
  for (const [i, j] of [[0, 0], [2, 3], [5, 5], [4, 1]]) { const m = mid(i, j); assert.deepEqual(cellAt(m.x, m.y, 6), { i, j }) }
  assert.equal(cellAt(0, -5, 6), null)
  assert.ok(byDepth({ i: 0, j: 0 }, { i: 1, j: 1 }) < 0)
  assert.match(wallMatrix('left', 6), /^matrix\(1 -0.5 0 1 -192 96\)$/)
  // Each arrow moves along one edge of the diamond, the way it points
  const go = (di, dj) => { const a = mid(2, 2), b = mid(2 + di, 2 + dj); return [Math.sign(b.x - a.x), Math.sign(b.y - a.y)] }
  assert.deepEqual(MOVES.map(([, , , di, dj]) => go(di, dj)), [[-1, -1], [1, -1], [-1, 1], [1, 1]])
})

test('every room kind comes furnished with pictures that exist, on its floor', () => {
  for (const [kind, k] of Object.entries(ROOM_KINDS)) {
    assert.ok(ITEM[k.sign], `${kind}: no picture for its sign ${k.sign}`)
    for (const [item, i, j] of k.items) {
      assert.ok(ITEM[item], `${kind}: no picture for ${item}`)
      assert.ok(i >= 0 && j >= 0 && i < ROOM_N && j < ROOM_N, `${kind}: ${item} is off the floor`)
    }
  }
})

test('every catalog picture was drawn', () => {
  for (const { k } of ITEMS) assert.ok(fs.existsSync(new URL(`../public/academy/items/${k}.webp`, import.meta.url)), `public/academy/items/${k}.webp is missing: run scripts/academy-art.mjs`)
  assert.ok(fs.existsSync(new URL('../public/academy/LICENSE-fluent-emoji.txt', import.meta.url)))
})

test('a new room lands on a free square near the front, and the campus grows', () => {
  const rooms = []
  for (const kind of ['office', 'classroom', 'library', 'hall']) rooms.push({ id: kind, ...newRoom(kind, rooms, 5) })
  assert.equal(new Set(rooms.map((r) => `${r.cx},${r.cy}`)).size, 4)
  assert.deepEqual(freeSquare([], 5), { i: 2, j: 2 })
  assert.equal(campusSize(0), 5); assert.equal(campusSize(30), 8); assert.equal(campusSize(200), 10)
  assert.equal(rooms[0].items.length, ROOM_KINDS.office.items.length)
  assert.deepEqual(moveItem({ i: 0, j: 5 }, -1, 1), { i: 0, j: 5 })
  const [a, b] = rooms
  assert.equal(moveRoom(a, b.cx - a.cx, b.cy - a.cy, rooms, 5), a) // can't land on another room
})

const T = '2026-11-04'
test('tasks: stars this month, and the day as she sees it', () => {
  const tasks = [{ id: 1, done_on: '2026-11-02' }, { id: 2, done_on: '2026-10-30' }, { id: 3, due_on: '2026-11-03' }, { id: 4, due_on: T }, { id: 5 }, { id: 6, due_on: '2026-11-06' }, { id: 7, done_on: T }]
  assert.equal(starsThisMonth(tasks, T), 2)
  const d = taskDay(tasks, T)
  assert.deepEqual([d.late, d.today, d.coming, d.done].map((l) => l.map((t) => t.id)), [[3], [4, 5], [6], [7]])
  assert.equal(dueWords('2026-11-05', T), 'Due tomorrow')
  assert.equal(dueWords('2026-11-06', T), 'Due Friday')
  assert.equal(dueWords('2026-11-03', T), 'Was due yesterday')
})

test('goals: how far along', () => {
  assert.deepEqual(goalProgress({ steps: [{ done: true }, { done: false }] }), { done: 1, total: 2, ratio: 0.5, finished: false })
  assert.equal(goalProgress({ steps: [], done_on: T }).ratio, 1)
})

test('grades: an A, or going up, is a cheer; a dip never says a word', () => {
  assert.equal(gradeRank({ mark: 'A-' }), 11); assert.equal(gradeRank({ mark: '94%' }), 12); assert.equal(gradeRank({ mark: '', percent: 88 }), 10); assert.equal(gradeRank({ mark: 'Pass' }), null)
  const hist = [{ id: 'a', class_name: 'Math', mark: 'B', on_date: '2026-10-01' }, { id: 'b', class_name: 'Math', mark: 'A-', on_date: '2026-11-01' }, { id: 'c', class_name: 'Science', mark: 'A', on_date: '2026-11-01' }, { id: 'd', class_name: 'Art', mark: 'B+', on_date: '2026-10-01' }, { id: 'e', class_name: 'Art', mark: 'B', on_date: '2026-11-01' }]
  assert.deepEqual(gradeCheer(hist[1], hist), { prize: '1st-place-medal', title: 'Up from B to A- in Math!' })
  assert.deepEqual(gradeCheer(hist[2], hist), { prize: '1st-place-medal', title: 'An A in Science!' })
  assert.equal(gradeCheer(hist[4], hist), null)
  assert.deepEqual(latestByClass(hist).map((g) => g.id), ['e', 'b', 'c'])
  const f = fame({ goals: [{ id: 1, title: 'Read 10 books', done_on: '2026-10-20' }], grades: hist, cheers: [{ id: 2, title: 'Brave at the dentist', on_date: '2026-11-03', icon: 'crown' }] })
  assert.deepEqual(f.map((x) => x.prize), ['crown', '1st-place-medal', '1st-place-medal', 'trophy'])
})

test('the spotlight is the newest cheer of the last week; the cafeteria changes daily', () => {
  assert.equal(spotlight([{ id: 1, on_date: '2026-10-20' }, { id: 2, on_date: '2026-11-01' }], T).id, 2)
  assert.equal(spotlight([{ id: 1, on_date: '2026-10-20' }], T), null)
  assert.equal(menuFor('2026-11-06'), 'Sushi Friday')
})

test('every kind of room has its own colour for its tile', async () => {
  const { KIND_COLOURS } = await import('../src/academy/rooms.js')
  for (const kind of Object.keys(ROOM_KINDS)) {
    assert.ok(KIND_COLOURS[kind], `${kind} has no colours`)
    for (const c of KIND_COLOURS[kind]) assert.match(c, /^#[0-9A-F]{6}$/i)
  }
})
