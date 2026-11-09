#!/usr/bin/env python3
"""
food-fills.py -- the shapes each food drawing is coloured in with (src/kitchen/FoodIcon.jsx).

Each file in public/food/ holds the Food Icon Pack's line drawing (`#ink`, CC BY 4.0, never
changed here) and the shape drawn under it in the ingredient's colour (`#fill`), and for a
drawing with stems or leaves a second shape for those (`#fill2`). This script works the
shapes out from the ink alone:

  1. The ink is drawn on a grid (512 across), its own way (nonzero), path by path.
  2. Everything the ink closes in is coloured: the holes no outside light reaches. Many
     drawings leave a small gap where a line stops short of another (a lime's rind, a
     cilantro leaf), so the gaps are closed first, by thickening the ink a little; only
     regions fat enough to be a real inside are kept, so the thickening never paints a web
     between two leaves.
  3. The colour reaches halfway under the ink, so its edge is hidden by the line.
  4. Where a drawing has stems or leaves of another colour (a carrot's top), the regions
     at its `second` points in scripts/food-fills.json go to `#fill2` instead; regions at its
     `empty` points (the space between a cherry's two stems) are left uncoloured.

The drawings themselves are never changed: only the shapes under them.

Run on a computer with Python 3, Pillow and numpy:
    python3 scripts/food-fills.py                   # every drawing in public/food/
    python3 scripts/food-fills.py --only lime,dill  # just these
    python3 scripts/food-fills.py --out /tmp/food   # write somewhere else, to look first
Settings for single drawings (how wide a gap to close, the stem points) are in
scripts/food-fills.json; `--show DIR` draws each drawing's regions there, numbered, and prints a
point in each, to pick the stems and leaves from.
"""
import argparse
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

N = 512          # the grid the ink is drawn on
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def read_ink(svg):
    m = re.search(r'<symbol id="ink" viewBox="([^"]+)">(.*?)</symbol>', svg, re.S)
    if not m:
        raise ValueError('no #ink symbol')
    vb = [float(v) for v in m.group(1).split()]
    paths = re.findall(r'<path d="([^"]+)"\s*/>', m.group(2))
    for d in paths:
        if re.search(r'[^MCLz0-9.\s-]', d):
            raise ValueError('a path with commands other than M, C, L and z')
    return m.group(0), vb, paths


def subpaths(d):
    """A path's subpaths as lists of points, curves flattened."""
    toks = re.findall(r'[MCLz]|-?\d+(?:\.\d+)?', d)
    out, cur, i, cmd = [], [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in 'MCLz':
            cmd = t
            i += 1
            if t == 'z':
                if len(cur) > 2:
                    out.append(cur)
                cur = []
            continue
        if cmd == 'M':
            if len(cur) > 2:
                out.append(cur)
            cur = [(float(toks[i]), float(toks[i + 1]))]
            i += 2
            cmd = 'L'
        elif cmd == 'L':
            cur.append((float(toks[i]), float(toks[i + 1])))
            i += 2
        elif cmd == 'C':
            x0, y0 = cur[-1]
            x1, y1, x2, y2, x3, y3 = (float(v) for v in toks[i:i + 6])
            for k in range(1, 13):
                s = k / 12
                a, b, c, e = (1 - s) ** 3, 3 * (1 - s) ** 2 * s, 3 * (1 - s) * s * s, s ** 3
                cur.append((a * x0 + b * x1 + c * x2 + e * x3, a * y0 + b * y1 + c * y2 + e * y3))
            i += 6
        else:
            raise ValueError('a number with no command')
    if len(cur) > 2:
        out.append(cur)
    return out


def rasterize(vb, paths, pad):
    """The ink as a boolean grid (N + 2 pad square), each path filled nonzero, as SVG draws it."""
    size = N + 2 * pad
    scale = N / vb[2]
    ink = np.zeros((size, size), bool)
    for d in paths:
        acc = np.zeros((size, size), np.int16)
        for poly in subpaths(d):
            pts = [((x - vb[0]) * scale + pad, (y - vb[1]) * scale + pad) for x, y in poly]
            area = sum(pts[k][0] * pts[k - 1][1] - pts[k - 1][0] * pts[k][1] for k in range(len(pts)))
            img = Image.new('L', (size, size), 0)
            ImageDraw.Draw(img).polygon(pts, fill=1)
            acc += (1 if area > 0 else -1) * np.array(img, np.int16)
        ink |= acc != 0
    return ink, scale


def dilate(m, r):
    if r <= 0:
        return m.copy()
    h, w = m.shape
    p = np.pad(m, r)
    out = np.zeros_like(m)
    for dy in range(-r, r + 1):
        half = int((r * r - dy * dy) ** 0.5)
        rows = p[r + dy:r + dy + h]
        for dx in range(-half, half + 1):
            out |= rows[:, r + dx:r + dx + w]
    return out


def erode(m, r):
    return ~dilate(~m, r)


def reach(free):
    """Where light from outside the picture gets to through `free` cells (4-connected)."""
    img = Image.fromarray(free.astype(np.uint8) * 255).copy()  # a copy: an image over an array is read-only
    ImageDraw.floodfill(img, (0, 0), 128)
    return np.array(img) == 128


def regions(mask):
    """Connected regions of a mask (4-connected), as a label grid and a count."""
    lab = np.zeros(mask.shape, np.int32)
    img = Image.fromarray(mask.astype(np.uint8) * 255).copy()
    n = 0
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        if lab[y, x]:
            continue
        n += 1
        ImageDraw.floodfill(img, (int(x), int(y)), 100)
        got = np.array(img) == 100
        lab[got] = n
        img.paste(0, mask=Image.fromarray(got.astype(np.uint8) * 255))
    return lab, n


def stroke_width(ink):
    """The drawing's usual line width in grid cells: how far the ink can be thinned before it goes."""
    total = ink.sum()
    for r in range(1, 30):
        if erode(ink, r).sum() < total * 0.04:
            return 2 * r
    return 30


def shapes(svg, opts):
    """The fill regions for one drawing: (cells, ink, scale, pad, vb), cells a label grid."""
    _, vb, paths = read_ink(svg)
    pad = 40
    ink, scale = rasterize(vb, paths, pad)
    sw = stroke_width(ink)
    gap = max(2, round(sw * opts.get('close', 0.75)))        # how wide a gap is closed
    thin = max(0, round(sw * opts.get('thin', 0.6)))         # narrower than this is a web, not an inside
    out0 = reach(~ink)
    holes = ~ink & ~out0                                     # what the ink closes in by itself
    sealed = ~dilate(reach(~dilate(ink, gap)), gap)          # ... and once its gaps are closed
    gained = sealed & ~ink & out0
    if thin:
        gained = dilate(erode(gained, thin), thin) & gained  # only regions fat enough to be an inside
    inside = holes | gained
    lab, n = regions(inside)
    min_area = (sw * 0.6) ** 2                               # crumbs between lines are left as ink
    for k in range(1, n + 1):
        if (lab == k).sum() < min_area:
            lab[lab == k] = 0
    return lab, ink, scale, pad, vb, sw


def trace(mask):
    """A mask's outline as closed loops of grid corners (every boundary edge once: draw them even-odd)."""
    m = np.pad(mask, 1)
    inner = m[1:-1, 1:-1]
    nxt = {}

    def add(ys, xs, dx0, dy0, dx1, dy1):
        for y, x in zip(ys.tolist(), xs.tolist()):
            nxt.setdefault((x + dx0, y + dy0), []).append((x + dx1, y + dy1))
    ys, xs = np.nonzero(inner & ~m[:-2, 1:-1]); add(ys, xs, 0, 0, 1, 0)      # top: left to right
    ys, xs = np.nonzero(inner & ~m[1:-1, 2:]); add(ys, xs, 1, 0, 1, 1)       # right: down
    ys, xs = np.nonzero(inner & ~m[2:, 1:-1]); add(ys, xs, 1, 1, 0, 1)       # bottom: right to left
    ys, xs = np.nonzero(inner & ~m[1:-1, :-2]); add(ys, xs, 0, 1, 0, 0)      # left: up
    loops = []
    while nxt:
        start = next(iter(nxt))
        loop, at = [start], start
        while True:
            ends = nxt[at]
            to = ends.pop()
            if not ends:
                del nxt[at]
            if to == start:
                break
            loop.append(to)
            at = to
        loops.append(loop)
    return loops


def simplify(loop, eps):
    """Fewer corners, the shape kept to within eps (Douglas-Peucker), for a closed loop."""
    pts = np.array(loop, float)
    if len(pts) < 8:
        return pts
    # Corners only: drop points in the middle of straight runs
    keep = [i for i in range(len(pts)) if not np.allclose(pts[i - 1] + pts[(i + 1) % len(pts)], 2 * pts[i])]
    pts = pts[keep] if len(keep) >= 4 else pts
    # Split the loop at its two farthest-apart points and simplify each half
    far = int(np.argmax(((pts - pts[0]) ** 2).sum(1)))
    out = []
    for seg in (np.vstack([pts[:far + 1]]), np.vstack([pts[far:], pts[:1]])):
        keepm = np.zeros(len(seg), bool)
        keepm[0] = keepm[-1] = True
        stack = [(0, len(seg) - 1)]
        while stack:
            a, b = stack.pop()
            if b <= a + 1:
                continue
            p, q = seg[a], seg[b]
            d = q - p
            L = np.hypot(*d)
            mid = seg[a + 1:b]
            dist = np.abs(d[0] * (mid[:, 1] - p[1]) - d[1] * (mid[:, 0] - p[0])) / L if L else np.hypot(*(mid - p).T)
            k = int(np.argmax(dist))
            if dist[k] > eps:
                keepm[a + 1 + k] = True
                stack += [(a, a + 1 + k), (a + 1 + k, b)]
        out.append(seg[keepm][:-1])
    return np.vstack(out)


def path_of(mask, scale, pad, vb):
    parts = []
    for loop in trace(mask):
        if len(loop) < 6:
            continue
        # The edge sits under the middle of a line ~14 cells wide, so it can stray 1.8 cells and never show
        pts = simplify(loop, 1.8)
        if len(pts) < 3:
            continue
        xy = [(round(vb[0] + (x - pad) / scale), round(vb[1] + (y - pad) / scale)) for x, y in pts]
        parts.append('M' + ' '.join(f'{x} {y}' for x, y in xy) + 'Z')  # after M, each pair is a line to it
    return ''.join(parts)


def fill_symbols(svg, opts, show=False, name=''):
    lab, ink, scale, pad, vb, sw = shapes(svg, opts)
    half = max(1, sw // 2 - 1)
    def picked(key):                                          # points in the 0-100 square the app draws in
        out = set()
        for x, y in opts.get(key, []):
            gx = int(round(pad + x / 100 * N)); gy = int(round(pad + y / 100 * N))
            if lab[gy, gx]:
                out.add(int(lab[gy, gx]))
            else:
                sys.exit(f'{name}: the {key} point {x},{y} is on the ink, not in a region (--show draws them)')
        return out
    for k in picked('empty'):                                 # a space the drawing leaves open, like between two stems
        lab[lab == k] = 0
    second = picked('second')
    if show:
        # Each region in its own colour, numbered at a point inside it, beside the list of points
        pic = np.full(lab.shape + (3,), 255, np.uint8)
        hues = [(240, 170, 120), (150, 200, 120), (130, 170, 230), (230, 140, 190), (240, 210, 100), (170, 140, 220), (120, 210, 200)]
        marks = []
        for k in range(1, lab.max() + 1):
            here = lab == k
            ys, xs = np.nonzero(here)
            if not len(ys):
                continue
            pic[here] = hues[k % len(hues)]
            inner = erode(here, 3)
            iy, ix = np.nonzero(inner) if inner.any() else (ys, xs)
            i = len(iy) // 2
            marks.append((k, ix[i], iy[i]))
            print(f'  {name} region {k}: {len(ys)} cells, a point in it: {(ix[i] - pad) / N * 100:.0f},{(iy[i] - pad) / N * 100:.0f}{" (second)" if k in second else ""}')
        pic[ink] = (40, 30, 25)
        img = Image.fromarray(pic)
        dr = ImageDraw.Draw(img)
        for k, x, y in marks:
            dr.text((int(x) - 4, int(y) - 6), str(k), fill=(0, 0, 0))
        img.save(os.path.join(show, name + '.png'))
    out = []
    for sym, keep in (('fill', lambda k: k not in second), ('fill2', lambda k: k in second)):
        cells = np.isin(lab, [k for k in range(1, lab.max() + 1) if keep(k)])
        if not cells.any():
            continue
        # Reach halfway under the ink, never past it
        area = dilate(cells, half) & (cells | ink)
        d = path_of(area, scale, pad, vb)
        if d:
            vbs = ' '.join(str(int(v)) if v == int(v) else str(v) for v in vb)
            out.append(f'<symbol id="{sym}" viewBox="{vbs}"><path fill-rule="evenodd" d="{d}"/></symbol>')
    return ''.join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dir', default=os.path.join(ROOT, 'public', 'food'))
    ap.add_argument('--out', default=None, help='write here instead of over the files')
    ap.add_argument('--only', default='', help='comma-separated names')
    ap.add_argument('--show', default=None, help='a folder: draws each region, numbered, and prints a point in each')
    a = ap.parse_args()
    with open(os.path.join(HERE, 'food-fills.json')) as f:
        conf = json.load(f)
    names = [n for n in a.only.split(',') if n] or sorted(f[:-4] for f in os.listdir(a.dir) if f.endswith('.svg'))
    out_dir = a.out or a.dir
    os.makedirs(out_dir, exist_ok=True)
    for name in names:
        path = os.path.join(a.dir, name + '.svg')
        with open(path) as f:
            svg = f.read()
        ink_sym, _, _ = read_ink(svg)
        opts = {**conf.get('default', {}), **conf.get('icons', {}).get(name, {})}
        if a.show:
            os.makedirs(a.show, exist_ok=True)
        fills = fill_symbols(svg, opts, a.show, name)
        new = f'<svg xmlns="http://www.w3.org/2000/svg">{fills}{ink_sym}</svg>'
        with open(os.path.join(out_dir, name + '.svg'), 'w') as f:
            f.write(new)
        if not a.show:
            print(name, 'two colours' if 'id="fill2"' in fills else '')


if __name__ == '__main__':
    main()
