// Tumble: her pumpkins and gourds (each cut whole from the painting's own pixels, with its painted outline) hop out of the
// painting one after another and roll into a pile at its foot. A copy of her pixels; the painting stays whole.
import { frameGeometry, stage, boxOf, clamp } from './kit.js'
import { cutFruit } from '../../lib/harvestFind.js'

const G = 1250 // gravity, px a second squared
const GROW = 1.3 // each comes out of the painting a third bigger, as if nearer

export function playTumble({ layer, p, el, look }) {
  const geo = frameGeometry(el, p), { W, H, crop } = geo
  const px = look.px480, s = crop.width / px.width
  const fruit = cutFruit(px, { max: 11 })
  const things = fruit.map((f, i) => {
    const c = document.createElement('canvas'); c.width = f.piece.w; c.height = f.piece.h
    c.getContext('2d').putImageData(new ImageData(f.piece.rgba, f.piece.w, f.piece.h), 0, 0)
    c.className = 'hv-piece'
    c.style.width = `${f.piece.w * s}px`; c.style.height = `${f.piece.h * s}px`; c.style.opacity = '0'
    layer.appendChild(c)
    // Where it was painted, from the middle of its own pixels (not the middle of the shape's cluster)
    const x = crop.left + (f.piece.x + f.piece.w / 2) * s, y = crop.top + (f.piece.y + f.piece.h / 2) * s
    const rad = Math.max(12, Math.min(0.3 * W, (Math.max(f.piece.w, f.piece.h) * s) / 2 * 0.86 * GROW))
    return { el: c, w: f.piece.w * s, h: f.piece.h * s, x, y, x0: x, y0: y, vx: 0, vy: 0, rot: 0, om: 0, rad, m: rad * rad, release: 0.9 + i * 0.42 + Math.random() * 0.2, state: 'wait', rest: 0 }
  })
  const floor = H + 4, lastGo = Math.max(0, ...things.map((t) => t.release)), end = lastGo + 9.5
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { things.forEach((th) => th.el.remove()); return false }
    for (const th of things) {
      if (t < th.release - 0.35) { th.el.style.opacity = '0'; continue }
      if (th.state === 'wait') {
        // A little shiver and a lift, then it is thrown
        if (t < th.release) { const f = clamp((t - (th.release - 0.35)) / 0.35); th.el.style.opacity = '1'; place(th, r, th.x0 + Math.sin(f * 40) * 1.6 * f, th.y0 - 5 * f, 0, 1 + 0.07 * f); continue }
        th.state = 'fly'; th.vy = -(190 + Math.random() * 130); th.vx = (th.x0 - W / 2) * 0.35 + (Math.random() - 0.5) * 110; th.om = (Math.random() - 0.5) * 6
      }
      th.vy += G * dt; th.x += th.vx * dt; th.y += th.vy * dt; th.rot += th.om * dt * 57.3
      // The ground just below the frame, and soft walls either side
      if (th.y + th.rad > floor) { th.y = floor - th.rad; if (th.vy > 40) th.vy *= -0.36; else th.vy = 0; th.vx *= Math.exp(-1.1 * dt); th.om = th.vx / th.rad }
      if (th.x - th.rad < -0.12 * W) { th.x = -0.12 * W + th.rad; th.vx = Math.abs(th.vx) * 0.4 }
      if (th.x + th.rad > 1.12 * W) { th.x = 1.12 * W - th.rad; th.vx = -Math.abs(th.vx) * 0.4 }
    }
    // Pushing one another apart, the heavier the less
    for (let a = 0; a < things.length; a++) for (let b = a + 1; b < things.length; b++) {
      const A = things[a], B = things[b]
      if (A.state !== 'fly' || B.state !== 'fly') continue
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01, min = (A.rad + B.rad) * 0.96
      if (d >= min) continue
      const nx = dx / d, ny = dy / d, push = (min - d), wa = B.m / (A.m + B.m), wb = A.m / (A.m + B.m)
      A.x -= nx * push * wa; A.y -= ny * push * wa; B.x += nx * push * wb; B.y += ny * push * wb
      const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny
      if (rv < 0) { const j = -rv * 1.25; A.vx -= nx * j * wa; A.vy -= ny * j * wa; B.vx += nx * j * wb; B.vy += ny * j * wb }
    }
    const fade = 1 - clamp((t - (end - 2.6)) / 2.6)
    for (const th of things) {
      if (th.state !== 'fly') continue
      th.el.style.opacity = fade.toFixed(3)
      place(th, r, th.x, th.y, th.rot, 1 + (GROW - 1) * clamp((t - th.release) / 0.5))
    }
    return true
  })
  return () => { stop(); things.forEach((th) => th.el.remove()) }
}

function place(th, r, x, y, rot, k) {
  th.el.style.transform = `translate3d(${(r.left + x - th.w / 2).toFixed(1)}px, ${(r.top + y - th.h / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${k.toFixed(3)})`
}
