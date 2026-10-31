// Draws the "H" home-screen icon options in docs/icon-options/ (decisions log, 2026-11-01): a white H on the
// current icon's sky. The first three are simple shapes drawn in code (and the app's own Caprasimo); the ten
// after them are the letter H as set in a font that is organic in itself, nothing added to it.
// Usage: node scripts/draw-h-icons.cjs [fonts] (needs Playwright, as scripts/make-icons.mjs does; "fonts"
// redraws only the ten). The fonts come from Google Fonts, all under the SIL Open Font License.
// node scripts/draw-h-icons.cjs maskable h-agbalumo draws one font option's Android "maskable" icon,
// <name>-maskable.png: the same sky with the H smaller, inside the circle a phone may crop to, which
// scripts/make-icons.mjs uses when it's beside the picture it's given.
const { chromium } = require('playwright');
const fs = require('fs');
const BG = `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6772C2"/><stop offset=".22" stop-color="#9580C1"/><stop offset=".42" stop-color="#C98FB5"/>
    <stop offset=".62" stop-color="#F6B897"/><stop offset=".82" stop-color="#FEC07B"/><stop offset="1" stop-color="#FC8F4D"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#FFF5E6" stop-opacity=".55"/><stop offset="1" stop-color="#FFF5E6" stop-opacity="0"/></radialGradient>
  <linearGradient id="leafg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B7DC6A"/><stop offset="1" stop-color="#5FA33A"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#7A3A20" flood-opacity=".28"/></filter>
</defs>
<rect width="1024" height="1024" fill="url(#sky)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;
const W = '#FFF8EE';
const OPTIONS = {
  // A: a chunky, soft H, a seedling rising from its crossbar between the stems
  'h-sprout': `<g filter="url(#sh)">
    <rect x="212" y="236" width="184" height="600" rx="64" fill="${W}"/><rect x="628" y="236" width="184" height="600" rx="64" fill="${W}"/>
    <rect x="360" y="508" width="304" height="140" rx="48" fill="${W}"/>
    <path d="M512 520 C 504 440, 494 390, 512 300" fill="none" stroke="${W}" stroke-width="36" stroke-linecap="round"/>
    <path d="M504 400 C 460 414, 414 392, 404 316 C 462 304, 498 344, 504 400 Z" fill="${W}"/>
    <path d="M496 392 C 464 396, 432 378, 424 332 C 462 326, 490 350, 496 392 Z" fill="url(#leafg)"/>
    <path d="M516 350 C 560 360, 618 336, 626 258 C 560 250, 520 292, 516 350 Z" fill="${W}"/>
    <path d="M526 340 C 560 344, 598 326, 606 274 C 562 272, 532 300, 526 340 Z" fill="url(#leafg)"/>
  </g>`,
  'h-leaf': `<g filter="url(#sh)">
    <path d="M320 850 C 196 700, 196 400, 320 180 C 444 400, 444 700, 320 850 Z" fill="${W}"/>
    <path d="M704 850 C 580 700, 580 400, 704 180 C 828 400, 828 700, 704 850 Z" fill="${W}"/>
    <path d="M320 810 V 230 M320 640 L 268 572 M320 480 L 268 418 M320 560 L 372 494 M704 810 V 230 M704 640 L 756 572 M704 480 L 756 418 M704 560 L 652 494" stroke="#EBC9A6" stroke-width="16" stroke-linecap="round" fill="none"/>
    <path d="M384 566 C 456 514, 568 618, 640 560" fill="none" stroke="${W}" stroke-width="84" stroke-linecap="round"/>
    <path d="M498 548 C 472 486, 498 430, 560 410 C 570 472, 550 526, 498 548 Z" fill="${W}"/>
    <path d="M508 528 C 492 486, 510 450, 546 434 C 552 474, 536 508, 508 528 Z" fill="url(#leafg)"/>
  </g>`,
  'h-caprasimo': `<g filter="url(#sh)">
    <text x="500" y="826" text-anchor="middle" font-family="Caprasimo" font-size="800" fill="${W}">H</text>
    <path d="M700 268 C 716 190, 800 140, 896 160 C 880 248, 800 296, 700 268 Z" fill="${W}"/>
    <path d="M720 256 C 742 202, 800 172, 870 180 C 852 238, 794 268, 720 256 Z" fill="url(#leafg)"/>
    <path d="M706 266 C 690 240, 684 212, 690 190" fill="none" stroke="${W}" stroke-width="18" stroke-linecap="round"/>
  </g>`,
};
// The ten fonts: each one's H, fitted into the same box, centred a little below the middle as the others are
const FONTS = [
  ['h-matemasie', 'Matemasie', 'A seed opening into its first two leaves (and a heart)'],
  ['h-microbe', 'Rubik Microbe', 'Built of cells, like something under a microscope'],
  ['h-wetpaint', 'Rubik Wet Paint', 'Still wet, dripping off the brush'],
  ['h-bubbles', 'Rubik Bubbles', 'Foam, or a cumulus cloud building'],
  ['h-hanalei', 'Hanalei Fill', 'Two stalks of bamboo, knuckled at every node'],
  ['h-darumadrop', 'Darumadrop One', 'Ink soaking into paper fibre, every edge ragged'],
  ['h-agbalumo', 'Agbalumo', 'Named for the African star apple: ripe, swelling curves'],
  ['h-beastly', 'Rubik Beastly', 'Furred, or a thistle head'],
  ['h-akaya', 'Akaya Kanadaka', 'Two knobbly twigs, lashed together'],
  ['h-moonrocks', 'Rubik Moonrocks', 'Pumice: stone full of holes'],
];
const BOX = { w: 640, h: 600, cx: 512, cy: 526 };
const out = (n) => require('path').join(__dirname, '..', 'docs', 'icon-options', n + '.png');

async function sheet(p, names, labels, file, cols) {
  const imgs = names.map((n) => 'data:image/png;base64,' + fs.readFileSync(out(n)).toString('base64'));
  await p.setViewportSize({ width: cols * 280 + 48, height: 400 });
  await p.setContent(`<body style="margin:0;background:#1D1A2E;font:700 17px Nunito,system-ui;color:#fff;padding:24px;display:grid;grid-template-columns:repeat(${cols},1fr);gap:28px 24px;text-align:center">${imgs.map((s, i) => `<div><img src="${s}" style="width:220px;border-radius:48px;display:block;margin:0 auto 14px"><img src="${s}" style="width:60px;border-radius:14px"><div style="margin-top:8px">${labels[i]}</div></div>`).join('')}</body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out(file), fullPage: true });
}

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const onlyFonts = process.argv[2] === 'fonts' || process.argv[2] === 'maskable';
  const maskable = process.argv[2] === 'maskable' ? process.argv[3] : null;
  for (const [name, art] of Object.entries(onlyFonts ? {} : OPTIONS)) {
    await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Caprasimo&display=block" rel="stylesheet"><style>body{margin:0}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${BG}${art}</svg></body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: out(name) });
  }
  if (!onlyFonts) await sheet(p, ['sprout-outline', 'h-sprout', 'h-leaf', 'h-caprasimo'], ['Now (sprout)', 'A · Sprouting H', 'B · Leaf H', 'C · Caprasimo H'], 'compare-h', 4);

  // The fonts: measure the ink of each one's H on a canvas, then scale and place it into BOX
  await p.setViewportSize({ width: 1024, height: 1024 });
  for (const [name, family] of FONTS) {
    if (maskable && name !== maskable) continue;
    const box = maskable ? { w: BOX.w * 0.66, h: BOX.h * 0.66, cx: 512, cy: 518 } : BOX;
    await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&display=block" rel="stylesheet"><style>body{margin:0}</style></head><body></body></html>`);
    const ink = await p.evaluate(async (f) => {
      await document.fonts.load(`1000px "${f}"`, 'H');
      const c = document.createElement('canvas'); c.width = c.height = 2400; const x = c.getContext('2d');
      x.font = `1000px "${f}"`; x.fillText('H', 600, 1700);
      const d = x.getImageData(0, 0, 2400, 2400).data; let x0 = 2400, y0 = 2400, x1 = -1, y1 = -1;
      for (let y = 0; y < 2400; y++) for (let i = 0; i < 2400; i++) if (d[(y * 2400 + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { x: x0 - 600, y: y0 - 1700, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    }, family);
    if (ink.w <= 0) throw new Error(family + ' drew nothing');
    const k = Math.min(box.w / ink.w, box.h / ink.h);
    const tx = box.cx - (ink.x + ink.w / 2) * k, ty = box.cy - (ink.y + ink.h / 2) * k;
    await p.evaluate(({ bg, f, k, tx, ty, w }) => {
      document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg}<g filter="url(#sh)"><text x="${tx}" y="${ty}" font-family="${f}" font-size="${1000 * k}" fill="${w}">H</text></g></svg>`;
    }, { bg: BG, f: family, k, tx, ty, w: W });
    await p.waitForTimeout(200);
    await p.screenshot({ path: out(maskable ? name + '-maskable' : name) });
  }
  if (!maskable) await sheet(p, FONTS.map((f) => f[0]), FONTS.map((f, i) => `${i + 1} · ${f[1]}`), 'compare-h2', 5);
  await b.close();
})();
