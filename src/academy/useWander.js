import { useEffect, useRef, useState } from 'react'
import { stepFrom } from './life.js'
import { reducedMotion } from '../lib/motion.js'

// A step takes a second on screen (.ac-walker and .ac-mascot in academy.css)
const ARRIVE = 1100

/**
 * Things that stroll by themselves (a room's animals, the campus's mascot). `list` is where each was put
 * ([{ id, i, j, reach }]); `fixed` the squares taken by everything that stays ('i,j' strings). Every few
 * seconds one of them takes a step onto a free square near its own. Returns where each one is just now
 * ({ [id]: { i, j, step, from } }); anything missing is at home. It's only ever on screen: nothing is saved,
 * and when `active` goes false (arranging, night, less motion) everyone is back on their own square.
 */
export function useWander(list, fixed, n, active, every = 2600) {
  const [at, setAt] = useState({})
  const key = `${list.map((w) => `${w.id}:${w.i},${w.j}`).join('|')}#${[...fixed].sort().join('|')}`
  const latest = useRef({ list, fixed })
  latest.current = { list, fixed }
  useEffect(() => { setAt({}) }, [key, active])
  useEffect(() => {
    if (!active || !list.length || reducedMotion()) return undefined
    let settle = null
    const t = setInterval(() => {
      if (document.hidden) return
      setAt((cur) => {
        const now = latest.current
        const w = now.list[Math.floor(Math.random() * now.list.length)]
        if (!w) return cur
        const pos = cur[w.id] || { i: w.i, j: w.j, step: 0 }
        const blocked = new Set(now.fixed)
        for (const o of now.list) if (o.id !== w.id) { const p = cur[o.id] || o; blocked.add(`${p.i},${p.j}`) }
        const next = stepFrom(pos, w, blocked, n, Math.random, w.reach)
        return next ? { ...cur, [w.id]: { ...next, step: (pos.step || 0) + 1, from: { i: pos.i, j: pos.j } } } : cur
      })
      // Once it has arrived it stands on one square only (`from` is for drawing it in front while it crosses)
      clearTimeout(settle)
      settle = setTimeout(() => setAt((cur) => (Object.values(cur).some((p) => p.from) ? Object.fromEntries(Object.entries(cur).map(([id, p]) => [id, { i: p.i, j: p.j, step: p.step }])) : cur)), ARRIVE)
    }, Math.max(every, ARRIVE + 300))
    return () => { clearInterval(t); clearTimeout(settle) }
  }, [key, active, n, every]) // eslint-disable-line react-hooks/exhaustive-deps
  return at
}
