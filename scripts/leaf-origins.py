#!/usr/bin/env python3
"""
Where each autumn leaf came from in Laurie's painting, so the wind can lift it
off from its own place (src/shell/WindShow.jsx).

The leaves on a sheet (scripts/lift-art.py autumn) are her own pixels, cut out
whole, so each one fits back into the painting exactly. This finds that place by
matching the leaf against the painting (masked least squares, by FFT), at the
scale between the flattened photo the leaves were cut from and the painting
file the app shows, and writes src/lib/leafOrigins.js. Nothing is redrawn and
nothing is generated: it only measures.

Run on a computer with Python 3, Pillow, numpy and scipy, from the repository,
after a sheet is cut or recut (the painting files are the development copies in
public/paintings/):

    python3 scripts/leaf-origins.py autumn-pond autumn-stream

It prints how closely each leaf fits (a mean squared difference, 0 to 1; a true
fit is well under 0.02) and refuses to write if any leaf doesn't fit.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

ROOT = Path(__file__).resolve().parent.parent
COARSE = [0.80, 0.825, 0.85, 0.875, 0.90, 0.925, 0.95]  # the photos were flattened a little larger than the files the app shows
WORST = 0.02


def sheet_of(slug):
    """The leaf sheet's file and boxes, as src/lib/paintings.js gives them."""
    src = (ROOT / 'src/lib/paintings.js').read_text(encoding='utf8')
    i = src.index(f"slug: '{slug}'")
    j = src.index('leaves:', i)
    sheet = src[src.index("sheet: '", j) + 8:]
    sheet = sheet[:sheet.index("'")]
    b = src.index('boxes:', j)
    return sheet, json.loads(src[b + 6:src.index(']]', b) + 2])


def fit(P, A):
    """Where a leaf (RGBA, 0..1) fits in the painting P (RGB, 0..1): (difference, x, y)."""
    M = (A[..., 3] > 0.7).astype(np.float32)
    T = A[..., :3]
    ssd = fftconvolve((P ** 2).sum(2), M[::-1, ::-1], mode='valid')
    for c in range(3):
        ssd -= 2 * fftconvolve(P[..., c], (M * T[..., c])[::-1, ::-1], mode='valid')
    ssd += (M[..., None] * T ** 2).sum()
    ssd /= max(1.0, M.sum())
    y, x = np.unravel_index(np.argmin(ssd), ssd.shape)
    return float(ssd[y, x]), int(x), int(y)


def origins(slug):
    sheet_path, boxes = sheet_of(slug)
    P = np.asarray(Image.open(ROOT / f'public/paintings/{slug}.jpg').convert('RGB')).astype(np.float32) / 255
    sheet = Image.open(ROOT / ('public' + sheet_path)).convert('RGBA')
    H, W = P.shape[:2]
    # The scale, found from the first few leaves (it is one scale for the whole sheet), then every leaf at it
    def at(box, s):
        x, y, w, h = box
        leaf = sheet.crop((x, y, x + w, y + h)).resize((max(4, round(w * s)), max(4, round(h * s))), Image.LANCZOS)
        A = np.asarray(leaf).astype(np.float32) / 255
        v, lx, ly = fit(P, A)
        return v, lx + leaf.size[0] / 2, ly + leaf.size[1] / 2
    first = min(COARSE, key=lambda s: at(boxes[0], s)[0])
    fine = [round(first + d * 0.003, 3) for d in range(-4, 5)]
    scale = min(fine, key=lambda s: sum(at(b, s)[0] for b in boxes[:2]))
    out, worst = [], 0
    for n, box in enumerate(boxes):
        v, cx, cy = at(box, scale)
        worst = max(worst, v)
        out.append([round(cx / W, 4), round(cy / H, 4)])
        print(f'{slug} leaf {n}: fits within {v:.4f} at ({cx:.0f}, {cy:.0f})')
    return {'scale': scale, 'origins': out}, worst


def main(slugs):
    data, bad = {}, []
    for slug in slugs:
        d, worst = origins(slug)
        data[slug] = d
        print(f'{slug}: scale {d["scale"]}, worst fit {worst:.4f}')
        if worst > WORST:
            bad.append(slug)
    if bad:
        sys.exit(f'Not written: a leaf on {", ".join(bad)} does not fit back into its painting. Was the sheet cut from this painting?')
    lines = [
        '// ============================================',
        '// leafOrigins.js -- where each autumn leaf sits in her painting',
        '// ============================================',
        '// Written by scripts/leaf-origins.py, which fits each leaf on a sheet back into the',
        '// painting it was cut from (they are her own pixels, so each fits exactly). For each',
        "// painting: `scale`, sheet pixels to painting pixels, and `origins`, each leaf's centre",
        '// as fractions of the painting, in the order of its sheet\'s boxes. Measured, never guessed.',
        '',
        'export const LEAF_ORIGINS = {',
    ]
    for slug, d in data.items():
        pts = ', '.join(f'[{x}, {y}]' for x, y in d['origins'])
        lines.append(f"  '{slug}': {{ scale: {d['scale']}, origins: [{pts}] }},")
    lines += ['}', '']
    (ROOT / 'src/lib/leafOrigins.js').write_text('\n'.join(lines), encoding='utf8')
    print('Wrote src/lib/leafOrigins.js')


if __name__ == '__main__':
    main(sys.argv[1:] or ['autumn-pond', 'autumn-stream'])
