// Made-up photos of a painting on a wall, for the auto-crop's tests: no real painting is ever in a test.
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) }

/**
 * A W x H photo: a wall lit unevenly with a little grain, and a painting of pw x ph centred at cx,cy leaning `angle` degrees
 * clockwise, made of patches of colour (`sky`: its top third is the wall's own colour, behind a thin dark edge).
 */
export function photo({ W = 480, H = 360, cx = 240, cy = 180, pw = 300, ph = 200, angle = 0, seed = 1, sky = false, wall = [214, 204, 188], none = false, wire = false }) {
  const r = rng(seed), data = new Uint8ClampedArray(W * H * 4)
  const a = (angle * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
  const patches = Array.from({ length: 64 }, () => [40 + r() * 180, 30 + r() * 160, 20 + r() * 170])
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const light = 0.82 + 0.18 * (1 - Math.hypot(x / W - 0.45, y / H - 0.4))
      let c = wall.map((v) => v * light + (r() - 0.5) * 6)
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = dx * cos + dy * sin, v = -dx * sin + dy * cos
      if (!none && Math.abs(u) <= pw / 2 && Math.abs(v) <= ph / 2) {
        const px = Math.floor(((u + pw / 2) / pw) * 8), py = Math.floor(((v + ph / 2) / ph) * 8)
        const edge = Math.abs(u) > pw / 2 - 1.5 || Math.abs(v) > ph / 2 - 1.5
        if (edge) c = [70, 60, 50]
        else if (sky && v < -ph / 6) c = wall.map((w) => w * light + (r() - 0.5) * 6)
        else { const p = patches[(py * 8 + px) % 64]; c = p.map((q) => q + Math.sin(u * 0.9) * 14 + (r() - 0.5) * 20) }
      }
      if (wire && Math.abs(x + 0.5 - cx - (y < cy ? (cy - ph / 2 - y) * 0.3 : 0)) < 0.8 && y < cy - ph / 2) c = [60, 60, 60]
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255
    }
  }
  return { data, width: W, height: H }
}
