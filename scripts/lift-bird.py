#!/usr/bin/env python3
"""
Lift a bird out of one of Laurie's paintings so it can fly (src/lib/paintings.js).

Two steps, run on a computer with Python 3, Pillow and numpy:

  1. flatten: a photo of the canvas on the wall -> the painting alone, square on.
       python3 scripts/lift-bird.py flatten photo.jpg flat.png --size 1440x1920
     The canvas's edges are found where its dark border meets the lighter wall;
     give --corners x,y,x,y,x,y,x,y (top-left, top-right, bottom-right,
     bottom-left) when they can't be.
  2. lift: flat.png -> <slug>-<bird>.png (the bird, soft-edged) and <slug>-sky.png
     (her sky filled in behind it), and prints the two boxes for paintings.js.
       python3 scripts/lift-bird.py lift flat.png --region 220,580,660,960 \
         --grain 520,300,760,420 --slug witch-and-crow --bird crow --out public/paintings
     --region is a box round the bird with sky all round it; --grain a patch of
     open sky to borrow the canvas's grain from.

The sky behind the bird is filled from its own surroundings (no image
generator is involved), and the bird and the sky composite back to the
painting: the error is printed. At rest the app always shows the painting
itself, unaltered.
"""
import argparse, json
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest='step', required=True)
f = sub.add_parser('flatten'); f.add_argument('photo'); f.add_argument('out'); f.add_argument('--size', default='1440x1920'); f.add_argument('--corners')
l = sub.add_parser('lift'); l.add_argument('flat'); l.add_argument('--region', required=True); l.add_argument('--grain', required=True)
l.add_argument('--slug', required=True); l.add_argument('--bird', default='bird'); l.add_argument('--out', default='public/paintings'); l.add_argument('--dark', type=float, default=110)
args = ap.parse_args()
box = lambda s: [int(v) for v in s.split(',')]


def flatten():
    im = Image.open(args.photo).convert('RGB'); L = np.asarray(im).astype(float).mean(axis=2); H, W = L.shape
    if args.corners:
        c = box(args.corners); src = [(c[0], c[1]), (c[2], c[3]), (c[4], c[5]), (c[6], c[7])]
    else:
        left, right, top, bot = [], [], [], []
        for y in range(int(H * .15), int(H * .9), 25):
            xs = np.where(L[y, :int(W * .17)] < 75)[0]; left += [(xs[0], y)] if len(xs) else []
            xs = np.where(L[y, int(W * .86):] < 75)[0]; right += [(int(W * .86) + xs[-1], y)] if len(xs) else []
        for x in range(int(W * .17), int(W * .86), 25):
            ys = np.where(L[:int(H * .12), x] < 75)[0]; top += [(x, ys[0])] if len(ys) else []
            ys = np.where(L[int(H * .9):, x] < 75)[0]; bot += [(x, int(H * .9) + ys[-1])] if len(ys) else []
        xy = lambda pts: np.polyfit([p[1] for p in pts], [p[0] for p in pts], 1)  # x = m*y + c
        yx = lambda pts: np.polyfit([p[0] for p in pts], [p[1] for p in pts], 1)  # y = m*x + c
        def meet(v, h):
            y = (h[0] * v[1] + h[1]) / (1 - h[0] * v[0]); return (v[0] * y + v[1], y)
        lv, rv, th, bh = xy(left), xy(right), yx(top), yx(bot)
        src = [meet(lv, th), meet(rv, th), meet(rv, bh), meet(lv, bh)]
        cx, cy = sum(p[0] for p in src) / 4, sum(p[1] for p in src) / 4
        src = [(p[0] + (4 if p[0] < cx else -4), p[1] + (4 if p[1] < cy else -4)) for p in src]  # no wall along the edge
    OW, OH = box(args.size.replace('x', ','))
    A, B = [], []
    for (x, y), (u, v) in zip([(0, 0), (OW, 0), (OW, OH), (0, OH)], src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    im.transform((OW, OH), Image.PERSPECTIVE, tuple(np.linalg.solve(np.array(A, float), np.array(B, float))), Image.BICUBIC).save(args.out)
    print('corners', [tuple(round(v) for v in p) for p in src])


def largest_dark(m):
    """The biggest connected dark shape in the region: the bird."""
    H, W = m.shape; lab = np.zeros((H, W), int); best, best_n, n = 0, 0, 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; stack = [(y, x)]; lab[y, x] = n; cnt = 0
                while stack:
                    cy, cx = stack.pop(); cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; stack.append((ny, nx))
                if cnt > best_n: best, best_n = n, cnt
    return lab == best


def lift():
    im = Image.open(args.flat).convert('RGB'); A = np.asarray(im).astype(np.float64); IH, IW = A.shape[:2]
    x0, y0, x1, y1 = box(args.region)
    R = A[y0:y1, x0:x1].copy(); L = R.mean(axis=2); H, W = L.shape
    crow = largest_dark(R.mean(axis=2) < args.dark)

    def dilate(m, r):
        out = m.copy()
        for _ in range(r):
            o = out.copy()
            o[1:] |= out[:-1]; o[:-1] |= out[1:]; o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
            out = o
        return out

    def fill(img, hole, iters=150):
        """Fill `hole` smoothly from its surroundings (a membrane), coarse to fine."""
        if min(img.shape[:2]) > 24:
            h2, w2 = (img.shape[0] + 1) // 2, (img.shape[1] + 1) // 2
            pad = np.pad(img, ((0, h2 * 2 - img.shape[0]), (0, w2 * 2 - img.shape[1]), (0, 0)), mode='edge')
            ph = np.pad(hole, ((0, h2 * 2 - hole.shape[0]), (0, w2 * 2 - hole.shape[1])), mode='edge')
            known = (~ph).astype(float)[..., None]
            s = (pad * known).reshape(h2, 2, w2, 2, 3).sum(axis=(1, 3)); k = known.reshape(h2, 2, w2, 2, 1).sum(axis=(1, 3))
            small = np.where(k > 0, s / np.maximum(k, 1e-9), 0); shole = k[..., 0] == 0
            small = fill(small, shole, iters)
            up = np.repeat(np.repeat(small, 2, axis=0), 2, axis=1)[:img.shape[0], :img.shape[1]]
            img = np.where(hole[..., None], up, img)
        else:
            img = np.where(hole[..., None], img[~hole].mean(axis=0), img)
        for _ in range(iters):
            p = np.pad(img, ((1, 1), (1, 1), (0, 0)), mode='edge')
            avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
            img = np.where(hole[..., None], avg, img)
        return img

    # 1. A first sky, filled in under the crow's dark body
    hole0 = dilate(crow, 6)
    B0 = fill(R, hole0)
    # 2. Its lighter edges and claws: anything near the crow clearly darker than that sky
    near = dilate(crow, 26)
    diff = B0.mean(axis=2) - L
    hole = dilate((hole0 | (near & (diff > 14))), 5)
    B = fill(R, hole, 300)
    # 3. The canvas's own grain, borrowed from open sky just above the crow, so the fill isn't glassy
    gx0, gy0, gx1, gy1 = box(args.grain)
    tex_src = Image.fromarray(np.uint8(np.clip(A[gy0:gy1, gx0:gx1], 0, 255)))
    blur = np.asarray(tex_src.filter(ImageFilter.GaussianBlur(6))).astype(float)
    grain = np.clip(np.asarray(tex_src).astype(float) - blur, -9, 9)
    grain = np.concatenate([grain, grain[:, ::-1]], axis=1)  # mirrored, so the tiles meet without a seam
    grain = np.concatenate([grain, grain[::-1]], axis=0)
    gy, gx = grain.shape[:2]
    tile = np.tile(grain, (H // gy + 1, W // gx + 1, 1))[:H, :W]
    B = np.where(hole[..., None], B + tile * 0.9, B)
    # 4. The crow as a matte over that sky: alpha from how much darker each pixel is
    Lb = B.mean(axis=2); F = np.array([22.0, 24.0, 34.0]); Lf = F.mean()
    alpha = np.clip((Lb - L) / np.maximum(Lb - Lf, 1), 0, 1)
    alpha = np.where(hole, alpha, 0)
    alpha[alpha < 0.04] = 0
    a3 = alpha[..., None]
    fg = np.where(a3 > 0, (R - (1 - a3) * B) / np.maximum(a3, 1e-6), 0)
    fg = np.clip(fg, 0, 255)
    # Composite check: sprite over filled sky must give back the painting
    comp = a3 * fg + (1 - a3) * B
    err = np.abs(comp - R)[hole].mean(); print('mean composite error inside the hole', round(err, 2))

    # Outputs
    ys, xs = np.where(alpha > 0); sx0, sy0, sx1, sy1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
    sprite = np.dstack([fg, alpha * 255])[sy0:sy1, sx0:sx1]
    Image.fromarray(np.uint8(np.round(sprite)), 'RGBA').save(f'{args.out}/{args.slug}-{args.bird}.png', optimize=True)
    hy, hx = np.where(hole); px0, py0, px1, py1 = hx.min() - 12, hy.min() - 12, hx.max() + 13, hy.max() + 13
    px0, py0 = max(px0, 0), max(py0, 0); px1, py1 = min(px1, W), min(py1, H)
    # The patch: filled sky, solid over the hole, fading to nothing over 10px beyond it
    feather = hole.astype(float)
    for i in range(10):
        grown = dilate(feather > 0, 1).astype(float) * (1 - (i + 1) / 11)
        feather = np.maximum(feather, grown)
    patch = np.dstack([np.clip(B, 0, 255), feather * 255])[py0:py1, px0:px1]
    Image.fromarray(np.uint8(np.round(patch)), 'RGBA').save(f'{args.out}/{args.slug}-sky.png', optimize=True)
    print(json.dumps({
      'at': [round((x0 + sx0) / IW, 4), round((y0 + sy0) / IH, 4), round((sx1 - sx0) / IW, 4), round((sy1 - sy0) / IH, 4)],
      'skyAt': [round((x0 + px0) / IW, 4), round((y0 + py0) / IH, 4), round((px1 - px0) / IW, 4), round((py1 - py0) / IH, 4)],
      'check': f'composite error {err:.2f} of 255',
    }))

flatten() if args.step == 'flatten' else lift()
