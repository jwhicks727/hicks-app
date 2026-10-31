#!/usr/bin/env python3
"""
Lift things out of Laurie's paintings so they can move (src/lib/paintings.js):
a bird that flies, or the leaves she painted, to drift across the screen.

Run on a computer with Python 3, Pillow and numpy:

  1. flatten: a photo of the canvas on the wall -> the painting alone, square on.
       python3 scripts/lift-art.py flatten photo.jpg flat.png --size 1440x1920
     The canvas's edges are found where its dark border meets the lighter wall;
     give --corners x,y,x,y,x,y,x,y (top-left, top-right, bottom-right,
     bottom-left) when they can't be.
  2. lift: flat.png -> <slug>-<bird>.png (the bird, soft-edged) and <slug>-sky.png
     (her sky filled in behind it), and prints the two boxes for paintings.js.
       python3 scripts/lift-bird.py lift flat.png --region 220,580,660,960 \
         --grain 520,300,760,420 --slug witch-and-crow --bird crow --out public/paintings
     --region is a box round the bird with sky all round it; --grain a patch of
     open sky to borrow the canvas's grain from.
  4. illustrate: a photo of one of our things (a crucifix, a statue) on a plain
     background -> a flat, inked illustration with the background cleared:
       python3 scripts/lift-art.py illustrate photo.jpg out.png --colours 7
     Colours are found in the photo itself (k-means), flattened, cleaned of
     speckle, and outlined where they meet. No image generator is involved.
  3. leaves: flat.png -> <slug>-leaves.png, a sheet of the small bright things
     she painted on a dark ground (leaves, petals, sparks), and prints where
     each one sits on the sheet.
       python3 scripts/lift-art.py leaves flat.png --region 0,1580,1080,1920 \\
         --slug witch-and-crow --count 24 --out public/paintings

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
v = sub.add_parser('leaves'); v.add_argument('flat'); v.add_argument('--region', required=True); v.add_argument('--slug', required=True)
v.add_argument('--count', type=int, default=24); v.add_argument('--out', default='public/paintings')
i = sub.add_parser('illustrate'); i.add_argument('photo'); i.add_argument('out'); i.add_argument('--colours', type=int, default=7); i.add_argument('--max', type=int, default=1400)
i.add_argument('--keep-background', action='store_true')
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



def leaves():
    """Her small painted things on a dark ground, each soft-edged, packed onto one sheet."""
    x0, y0, x1, y1 = box(args.region)
    im = Image.open(args.flat).convert('RGB'); A = np.asarray(im).astype(np.float64)[y0:y1, x0:x1]
    L = A.mean(axis=2)
    Lim = Image.fromarray(np.uint8(np.clip(L, 0, 255)))
    bgL = np.asarray(Lim.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(12))).astype(float)
    rgb = Image.fromarray(np.uint8(np.clip(A, 0, 255)))
    bgC = np.asarray(rgb.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(12))).astype(float)
    alpha = np.clip((L - bgL - 14) / 46, 0, 1)
    sat = A.max(axis=2) - A.min(axis=2)
    core = (alpha > 0.45) & (sat > 30)
    H, W = core.shape; lab = np.zeros((H, W), int); comps = []; n = 0
    for y in range(H):
        for x in range(W):
            if core[y, x] and not lab[y, x]:
                n += 1; stack = [(y, x)]; lab[y, x] = n; pts = []
                while stack:
                    cy, cx = stack.pop(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and core[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; stack.append((ny, nx))
                ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                if 40 <= len(pts) <= 2500: comps.append((len(pts), min(xs), min(ys), max(xs), max(ys)))
    comps.sort(reverse=True); comps = comps[:args.count]
    m = 4; cells = []
    for _, a, b, c, d in comps:
        a, b, c, d = max(a - m, 0), max(b - m, 0), min(c + m + 1, W), min(d + m + 1, H)
        al = alpha[b:d, a:c][..., None]; fg = np.where(al > 0, (A[b:d, a:c] - (1 - al) * bgC[b:d, a:c]) / np.maximum(al, 1e-6), 0)
        cells.append(np.dstack([np.clip(fg, 0, 255), al[..., 0] * 255]))
    # Pack them in a row, left to right
    sw = sum(cl.shape[1] + 2 for cl in cells); sh = max(cl.shape[0] for cl in cells)
    sheet = np.zeros((sh, sw, 4)); boxes = []; x = 0
    for cl in cells:
        h, w = cl.shape[:2]; sheet[:h, x:x + w] = cl; boxes.append([x, 0, w, h]); x += w + 2
    Image.fromarray(np.uint8(np.round(sheet)), 'RGBA').save(f'{args.out}/{args.slug}-leaves.png', optimize=True)
    print(json.dumps({'sheet': [sw, sh], 'boxes': boxes}))




def illustrate():
    """A photo made into a flat, inked illustration: its own colours, flattened and outlined."""
    im = Image.open(args.photo).convert('RGB')
    k = min(1, args.max / max(im.size)); im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    A = np.asarray(im.filter(ImageFilter.MedianFilter(5))).astype(np.float64); H, W = A.shape[:2]
    # The background: the colour round the edges; the subject is what differs from it
    edge = np.concatenate([A[0], A[-1], A[:, 0], A[:, -1]])
    bg = np.median(edge, axis=0)
    dist = np.sqrt(((A - bg) ** 2).sum(axis=2))
    subject = np.ones((H, W), bool) if args.keep_background else dist > max(28, np.percentile(np.sqrt(((edge - bg) ** 2).sum(axis=1)), 95) * 1.4)
    # Its colours: k-means on the subject's pixels, a fixed start so a re-run matches
    px = A[subject].reshape(-1, 3)
    rng = np.random.default_rng(7); sample = px[rng.choice(len(px), min(len(px), 40000), replace=False)]
    centres = sample[np.linspace(0, len(sample) - 1, args.colours).astype(int)]
    for _ in range(20):
        lab = ((sample[:, None, :] - centres[None]) ** 2).sum(axis=2).argmin(axis=1)
        centres = np.array([sample[lab == c].mean(axis=0) if (lab == c).any() else centres[c] for c in range(args.colours)])
    idx = ((A.reshape(-1, 1, 3) - centres[None]) ** 2).sum(axis=2).argmin(axis=1).reshape(H, W)
    # Clean the speckle: each pixel takes its neighbourhood's commonest colour
    idx = np.asarray(Image.fromarray(idx.astype(np.uint8)).filter(ImageFilter.ModeFilter(7))).astype(int)
    flat = centres[idx]
    # Lift the flat colours a little, as an illustration would
    flat = np.clip(flat * 1.06 + 8, 0, 255)
    # Ink where colours meet, and round the subject
    ink = np.zeros((H, W), bool)
    ink[1:] |= idx[1:] != idx[:-1]; ink[:, 1:] |= idx[:, 1:] != idx[:, :-1]
    sub = np.asarray(Image.fromarray((subject * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(5))) > 127
    ink[1:] |= sub[1:] != sub[:-1]; ink[:, 1:] |= sub[:, 1:] != sub[:, :-1]
    ink = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
    out = np.dstack([flat, np.full((H, W), 255.0)])
    out[ink, :3] = [43, 32, 25]
    if not args.keep_background:
        alpha = np.asarray(Image.fromarray((sub * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
        out[..., 3] = np.maximum(alpha, ink * 255.0 * sub)
    Image.fromarray(np.uint8(np.round(out)), 'RGBA').save(args.out, optimize=True)
    print(json.dumps({'size': [W, H], 'colours': [('#%02X%02X%02X' % tuple(int(v) for v in c)) for c in centres]}))


{'flatten': flatten, 'lift': lift, 'leaves': leaves, 'illustrate': illustrate}[args.step]()
